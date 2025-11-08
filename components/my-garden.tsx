"use client";

import { usePlants } from "@/hooks/usePlants";
import { useContract } from "@/hooks/useContract";
import { calculateWaterLevel, getSeed } from "@/lib/contract";
import { useEffect, useState } from "react";
import { Droplet, Clock, Leaf, Plus } from "lucide-react";
import { GrowthStage } from "@/types/contract";

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
  const [plantsWithDetails, setPlantsWithDetails] = useState<
    PlantWithDetails[]
  >([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [wateringPlantId, setWateringPlantId] = useState<bigint | null>(null);
  const [harvestingPlantId, setHarvestingPlantId] = useState<bigint | null>(
    null
  );

  // Fetch plant details including water level and seed info
  useEffect(() => {
    const fetchPlantDetails = async () => {
      if (!client || !address || !isConnected || plants.length === 0) {
        setPlantsWithDetails([]);
        return;
      }

      setLoadingDetails(true);
      try {
        const detailsPromises = plants.map(async (plant) => {
          console.log("plant map", plant);
          try {
            // Get water level from contract
            const waterLevel = await calculateWaterLevel(
              client,
              plant.id,
              address
            );
            // const waterLevel = 0;
            console.log("waterLevel map await", waterLevel);

            // Get seed info to calculate growth progress
            // const seed = await getSeed(client, plant.seedId);
            const seed = {
              id: 0,
              name: "Tomato",
              stageDuration: BigInt(1000),
              harvestReward: BigInt(1000),
              depletionTime: BigInt(1000),
              depletionRate: 1000,
              price: BigInt(1000),
              stock: BigInt(1000),
            };
            console.log("seed map await", seed);
            // Calculate growth progress based on stage
            const now = BigInt(Math.floor(Date.now() / 1000));
            const planted = plant.plantedDate;
            const timeSincePlanted = now - planted;

            // Calculate expected stage
            let expectedStage = GrowthStage.SPROUT;
            if (timeSincePlanted > seed.stageDuration * BigInt(3)) {
              expectedStage = GrowthStage.BLOOMING;
            } else if (timeSincePlanted > seed.stageDuration * BigInt(2)) {
              expectedStage = GrowthStage.GROWING;
            } else if (timeSincePlanted > seed.stageDuration) {
              expectedStage = GrowthStage.SPROUT;
            }

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
            console.error(
              `Error fetching details for plant ${plant.id}:`,
              error
            );
            return null;
          }
        });

        const details = await Promise.all(detailsPromises);
        console.log("details", details);
        setPlantsWithDetails(
          details.filter((d): d is PlantWithDetails => d !== null)
        );
      } catch (error) {
        console.error("Error fetching plant details:", error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchPlantDetails();
  }, [client, address, isConnected, plants]);

  const handleWater = async (plantId: bigint) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    setWateringPlantId(plantId);
    try {
      await waterPlant(plantId);
    } catch (error) {
      console.error("Error watering plant:", error);
    } finally {
      setWateringPlantId(null);
    }
  };

  const handleHarvest = async (plantId: bigint) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    // Harvest all plants that are ready (blooming stage)
    setHarvestingPlantId(plantId);
    try {
      await harvestPlant(plantId);
    } catch (error) {
      console.error("Error harvesting plant:", error);
    } finally {
      setHarvestingPlantId(null);
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

            {/* Add Plants Card */}
            <div
              onClick={onAddPlant}
              className="bg-slate-700/40 hover:bg-slate-600/40 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px]"
            >
              <Plus className="w-12 h-12 text-white mb-2" />
              <span className="text-gray-300 font-medium">Add Plants</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadingDetails && plantsWithDetails.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No plants in your garden yet</p>
            <button
              onClick={onAddPlant}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors font-medium"
            >
              Add Your First Plant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
