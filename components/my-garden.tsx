"use client";

import { usePlants } from "@/hooks/usePlants";
import { useContract } from "@/hooks/useContract";
import { useGarden } from "@/hooks/useGarden";
import { useToast } from "@/hooks/use-toast";
import {
  calculateWaterLevel,
  upgradeGarden,
  claimGarden,
} from "@/lib/contract";
import { useEffect, useState, useCallback, useRef } from "react";
import { Droplet, Clock, Leaf, Plus, Lock } from "lucide-react";
import { GrowthStage } from "@/types/contract";
import { SEED_MARKET } from "@/lib/constants";
import type { Account } from "thirdweb/wallets";

// Helper function to format bigint to ether string
function formatEther(value: bigint): string {
  const divisor = BigInt(10 ** 18);
  const whole = value / divisor;
  const remainder = value % divisor;
  const decimals = Number(remainder) / Number(divisor);
  return (Number(whole) + decimals).toFixed(6).replace(/\.?0+$/, "");
}

interface PlantWithDetails {
  id: bigint;
  seedId: bigint;
  name: string;
  stage: GrowthStage;
  waterLevel: number;
  growthProgress: number;
  seedName: string;
}

export function MyGarden({ onAddPlant }: { onAddPlant: () => void }) {
  const { plants, loading, waterPlant, harvestPlant } = usePlants();
  const { client, account, address, isConnected } = useContract();
  const { garden, upgradeCost, isSlotsFull, fetchGarden } = useGarden();
  const { toast } = useToast();
  const [plantsWithDetails, setPlantsWithDetails] = useState<
    PlantWithDetails[]
  >([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [wateringPlantId, setWateringPlantId] = useState<bigint | null>(null);
  const [harvestingPlantId, setHarvestingPlantId] = useState<bigint | null>(
    null
  );
  const [upgrading, setUpgrading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const isInitialLoadRef = useRef(true);
  const previousPlantsRef = useRef<string>("");

  // Fetch plant details including water level and seed info
  const fetchPlantDetails = useCallback(async (silent = false) => {
    if (!client || !address || !isConnected) {
      if (plants.length === 0) {
        setPlantsWithDetails([]);
      }
      return;
    }

    // Only show loading on initial load
    if (!silent && isInitialLoadRef.current) {
      setLoadingDetails(true);
    }

    try {
      // If no plants, clear details but don't show loading
      if (plants.length === 0) {
        setPlantsWithDetails([]);
        isInitialLoadRef.current = false;
        setLoadingDetails(false);
        return;
      }

      const detailsPromises = plants.map(async (plant) => {
        try {
          // Get water level from contract
          const waterLevel = await calculateWaterLevel(
            client,
            plant.id,
            address
          );
          // Get seed info to calculate growth progress
          const seed = SEED_MARKET[Number(plant.seedId)];
          // Calculate growth progress based on stage
          const now = BigInt(Math.floor(Date.now() / 1000));
          const planted = plant.plantedDate;
          const timeSincePlanted = now - planted;

          // Calculate growth progress percentage
          let growthProgress = 0;
          if (plant.stage === GrowthStage.BLOOMING) {
            growthProgress = 100;
          } else if (plant.stage === GrowthStage.GROWING) {
            growthProgress = 75;
          } else if (plant.stage === GrowthStage.SPROUT) {
            growthProgress = 50;
          } else {
            growthProgress = 25;
          }

          return {
            id: plant.id,
            seedId: plant.seedId,
            name: plant.name,
            stage: plant.stage,
            waterLevel: Number(waterLevel),
            growthProgress,
            seedName: seed.name,
          };
        } catch (error) {
          return null;
        }
      });

      const details = await Promise.all(detailsPromises);
      const validDetails = details.filter((d): d is PlantWithDetails => d !== null);
      
      // Only update if we have valid details or if plants array is empty
      setPlantsWithDetails(validDetails);
      isInitialLoadRef.current = false;
    } catch (error) {
      // Silently handle error
    } finally {
      setLoadingDetails(false);
    }
  }, [client, address, isConnected, plants]);

  // Track plants changes to prevent unnecessary re-renders
  useEffect(() => {
    const plantsKey = plants.map(p => `${p.id}-${p.stage}-${p.plantedDate}`).join(',');
    
    // Only fetch if plants actually changed
    if (previousPlantsRef.current !== plantsKey) {
      previousPlantsRef.current = plantsKey;
      
      if (isInitialLoadRef.current) {
        // Initial load - show loading
        fetchPlantDetails(false);
      } else if (client && address && isConnected) {
        // Auto-refresh - silent mode
        fetchPlantDetails(true);
      }
    }
  }, [plants, client, address, isConnected, fetchPlantDetails]);

  const handleWater = async (plantId: bigint) => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setWateringPlantId(plantId);
    try {
      await waterPlant(plantId);
      // Recalculate water level after watering
      // Wait a bit for the transaction to be fully processed
      setTimeout(() => {
        fetchPlantDetails(true); // Silent mode - no loading state
      }, 1000);
    } catch (error) {
      // Error is handled by usePlants hook
    } finally {
      setWateringPlantId(null);
    }
  };

  const handleHarvest = async (plantId: bigint) => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Harvest all plants that are ready (blooming stage)
    setHarvestingPlantId(plantId);
    try {
      await harvestPlant(plantId);
    } catch (error) {
      // Error is handled by usePlants hook
    } finally {
      setHarvestingPlantId(null);
    }
  };

  const handleClaimGarden = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!client || !account || !address) {
      toast({
        title: "Wallet error",
        description: "Wallet not properly connected",
        variant: "destructive",
      });
      return;
    }

    // Type guard: ensure account is a full Account
    if (!("sendTransaction" in account) || !("signMessage" in account)) {
      toast({
        title: "Wallet error",
        description: "Wallet not properly connected",
        variant: "destructive",
      });
      return;
    }

    setClaiming(true);
    try {
      const txHash = await claimGarden(client, account as Account, address);

      if (!txHash) {
        throw new Error(
          "Transaction hash not returned. Transaction may have failed."
        );
      }

      toast({
        title: "Garden claimed successfully! 🎉",
        description: `You now have 3 garden slots! Transaction: ${txHash.slice(0, 10)}...`,
      });

      // Refresh garden data
      await fetchGarden();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to claim garden. Please try again.";
      toast({
        title: "Error",
        description: `${errorMessage}. Please check: 1. You have enough ETH balance 2. The transaction was approved in your wallet 3. The network is Sepolia`,
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleUpgradeGarden = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!client || !account || !address) {
      toast({
        title: "Wallet error",
        description: "Wallet not properly connected",
        variant: "destructive",
      });
      return;
    }

    // Type guard: ensure account is a full Account
    if (!("sendTransaction" in account) || !("signMessage" in account)) {
      toast({
        title: "Wallet error",
        description: "Wallet not properly connected",
        variant: "destructive",
      });
      return;
    }

    if (!garden) {
      toast({
        title: "Garden required",
        description: "You need to claim a garden first",
        variant: "destructive",
      });
      return;
    }

    setUpgrading(true);
    try {
      const txHash = await upgradeGarden(client, account as Account, address);

      if (!txHash) {
        throw new Error(
          "Transaction hash not returned. Transaction may have failed."
        );
      }

      toast({
        title: "Garden upgraded successfully! 🎉",
        description: `You now have 2 more garden slots! Transaction: ${txHash.slice(0, 10)}...`,
      });

      // Refresh garden data
      await fetchGarden();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upgrade garden. Please try again.";
      toast({
        title: "Error",
        description: `${errorMessage}. Please check: 1. You have enough ETH balance 2. The transaction was approved in your wallet 3. The network is Sepolia`,
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const getPlantEmoji = (seedName: string) => {
    const name = seedName.toLowerCase();
    if (name.includes("tomato")) return "🍅";
    if (name.includes("carrot")) return "🥕";
    if (name.includes("corn")) return "🌽";
    return "🌱";
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-3xl p-8 text-white text-center">
          <p className="text-lg">
            Please connect your wallet to view your garden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-3xl p-6 w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-green-400 text-xl">🌱</span>
          <h2 className="text-white text-2xl font-bold">
            My Garden{" "}
            <span className="text-gray-400 font-normal text-lg">
              ({plantsWithDetails.length} plants)
            </span>
          </h2>
        </div>

        {/* Loading State */}
        {(loading || loadingDetails) && plantsWithDetails.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="ml-3 text-white">Loading your plants...</span>
          </div>
        )}

        {/* Plants Grid */}
        {!loading && !loadingDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {plantsWithDetails.map((plant) => (
              <div
                key={plant.id.toString()}
                className="bg-slate-700/60 rounded-2xl p-4 space-y-3"
              >
                {/* Plant Header */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {getPlantEmoji(plant.seedName)}
                  </span>
                  <h3 className="text-white text-lg font-semibold">
                    {plant.name}
                  </h3>
                </div>

                {/* Water Level */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300">Water level</span>
                    </div>
                    <span className="text-white font-medium">
                      {plant.waterLevel}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${plant.waterLevel}%` }}
                    />
                  </div>
                </div>

                {/* Growth Progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">Growth progress</span>
                    </div>
                    <span className="text-white font-medium">
                      {plant.growthProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-gray-400 h-2 rounded-full transition-all"
                      style={{ width: `${plant.growthProgress}%` }}
                    />
                  </div>
                </div>

                {/* Water Button */}
                <button
                  onClick={() => handleWater(plant.id)}
                  disabled={wateringPlantId === plant.id}
                  className="w-full bg-slate-600/60 hover:bg-slate-500/60 disabled:bg-slate-700/40 disabled:cursor-not-allowed text-white py-2 px-3 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  {wateringPlantId === plant.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Watering...
                    </>
                  ) : (
                    <>
                      <Droplet className="w-4 h-4 text-blue-400" />
                      Water
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleHarvest(plant.id)}
                  disabled={plant.stage !== GrowthStage.BLOOMING}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700/40 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {harvestingPlantId !== null ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Harvesting...
                    </>
                  ) : (
                    <>
                      <Leaf className="w-5 h-5 text-green-400" />
                      Harvest
                    </>
                  )}
                </button>
              </div>
            ))}

            {/* Add Plants Card or Upgrade Card */}
            {isSlotsFull() ? (
              <div className="bg-slate-700/60 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[200px] space-y-3">
                <Lock className="w-12 h-12 text-yellow-400 mb-2" />
                <h3 className="text-white font-semibold text-lg">
                  Garden Slots Full
                </h3>
                <p className="text-gray-400 text-sm text-center">
                  You've used all {garden ? Number(garden.totalSlot) : 0} garden
                  slots
                </p>
                {upgradeCost && (
                  <p className="text-white font-mono text-sm">
                    Upgrade Cost: {formatEther(upgradeCost)} ETH
                  </p>
                )}
                <button
                  onClick={handleUpgradeGarden}
                  disabled={upgrading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700/40 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {upgrading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Upgrade Garden (+2 slots)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div
                onClick={onAddPlant}
                className="bg-slate-700/40 hover:bg-slate-600/40 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px]"
              >
                <Plus className="w-12 h-12 text-white mb-2" />
                <span className="text-gray-300 font-medium">Add Plants</span>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadingDetails && plantsWithDetails.length === 0 && (
          <div className="text-center py-12">
            {!garden ? (
              <>
                <p className="text-gray-400 mb-4">
                  You need to claim a garden first
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Claiming a garden will give you 3 garden slots to start
                  planting!
                </p>
                <button
                  onClick={handleClaimGarden}
                  disabled={claiming}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700/40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 mx-auto"
                >
                  {claiming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Leaf className="w-5 h-5" />
                      Claim Garden
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-4">
                  No plants in your garden yet
                </p>
                <button
                  onClick={onAddPlant}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors font-medium"
                >
                  Add Your First Plant
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
