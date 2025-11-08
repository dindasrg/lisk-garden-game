'use client'

import { X } from "lucide-react";
import { useContract } from "@/hooks/useContract";
import { useState, useEffect } from "react";
import { buySeed as buySeedContract, getSeed, plantSeed as plantSeedContract, claimGarden, getGarden } from "@/lib/contract";
import type { Account } from "thirdweb/wallets";

// Helper function to format bigint to ether string
function formatEther(value: bigint): string {
  const divisor = BigInt(10 ** 18);
  const whole = value / divisor;
  const remainder = value % divisor;
  const decimals = Number(remainder) / Number(divisor);
  return (Number(whole) + decimals).toFixed(6).replace(/\.?0+$/, '');
}

interface Seed {
  id: number;
  name: string;
  emoji: string;
  price: string;
  growthTime: string;
  depletionTime: string;
  harvestReward: string;
  stock: number;
}

interface MarketplaceCardProps {
  isVisible: boolean;
  onClose: () => void;
  onBuySeed?: (seedId: number) => void;
}

export function MarketplaceCard({ isVisible, onClose, onBuySeed }: MarketplaceCardProps) {
  const { isConnected, client, account, address } = useContract();
  const [loading, setLoading] = useState<number | null>(null);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loadingSeeds, setLoadingSeeds] = useState(true);

  // Fetch seeds from contract
  useEffect(() => {
    const fetchSeeds = async () => {
      if (!client) {
        // Fallback to mock data if client not available
        setSeeds([
          {
            id: 0,
            name: "Tomato",
            emoji: "🍅",
            price: "0.0002 ETH",
            growthTime: "1m/stage",
            depletionTime: "45 Seconds",
            harvestReward: "0.0004 ETH",
            stock: 4
          },
          {
            id: 1,
            name: "Carrot",
            emoji: "🥕",
            price: "0.0001 ETH",
            growthTime: "30s/stage",
            depletionTime: "30 Seconds",
            harvestReward: "0.0002 ETH",
            stock: 10
          },
          {
            id: 2,
            name: "Corn",
            emoji: "🌽",
            price: "0.0005 ETH",
            growthTime: "4m/stage",
            depletionTime: "1 Minutes",
            harvestReward: "0.001 ETH",
            stock: 1
          }
        ]);
        setLoadingSeeds(false);
        return;
      }

      setLoadingSeeds(true);
      try {
        // Fetch seeds from contract (assuming seed IDs 0, 1, 2)
        const seedPromises = [0, 1, 2].map(async (seedId) => {
          try {
            const seed = await getSeed(client, BigInt(seedId));
            const emoji = seed.name.toLowerCase().includes('tomato') ? '🍅' 
              : seed.name.toLowerCase().includes('carrot') ? '🥕'
              : seed.name.toLowerCase().includes('corn') ? '🌽'
              : '🌱';
            
            return {
              id: Number(seed.id),
              name: seed.name,
              emoji,
              price: `${formatEther(seed.price)} ETH`,
              growthTime: `${Number(seed.stageDuration)}s/stage`,
              depletionTime: `${Number(seed.depletionTime)} Seconds`,
              harvestReward: `${formatEther(seed.harvestReward)} ETH`,
              stock: Number(seed.stock)
            };
          } catch (error) {
            console.error(`Error fetching seed ${seedId}:`, error);
            return null;
          }
        });

        const fetchedSeeds = await Promise.all(seedPromises);
        const validSeeds = fetchedSeeds.filter((s): s is Seed => s !== null);
        setSeeds(validSeeds);
      } catch (error) {
        console.error("Error fetching seeds:", error);
      } finally {
        setLoadingSeeds(false);
      }
    };

    if (isVisible) {
      fetchSeeds();
    }
  }, [isVisible, client]);

  const handleBuySeed = async (seedId: number) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!client || !account || !address) {
      alert("Wallet not properly connected");
      return;
    }

    // Type guard: ensure account is a full Account
    if (!('sendTransaction' in account) || !('signMessage' in account)) {
      alert("Wallet not properly connected");
      return;
    }

    setLoading(seedId);
    let claimTxHash: string | null = null;
    try {
      // First, check if user has a garden, if not, claim one
      console.log("Checking if user has a garden...");
      const garden = await getGarden(client, address);
      
      if (!garden) {
        console.log("No garden found. Claiming garden...");
        try {
          claimTxHash = await claimGarden(
            client,
            account as Account,
            address
          );
          
          if (!claimTxHash) {
            throw new Error("Garden claim transaction hash not returned. Transaction may have failed.");
          }

          // Verify transaction hash format
          if (typeof claimTxHash !== 'string' || !claimTxHash.startsWith('0x')) {
            throw new Error(`Invalid garden claim transaction hash: ${claimTxHash}`);
          }

          console.log(`Garden claimed! Transaction: ${claimTxHash}`);
          console.log(`View on BlockScout: https://sepolia-blockscout.lisk.com/tx/${claimTxHash}`);
        } catch (claimError) {
          console.error("Error claiming garden:", claimError);
          const claimErrorMessage = claimError instanceof Error ? claimError.message : "Failed to claim garden. Please try again.";
          throw new Error(`Failed to claim garden: ${claimErrorMessage}\n\nYou need a garden to plant seeds.`);
        }
      } else {
        console.log("Garden found:", { gardenId: garden.id, totalSlots: garden.totalSlot, reservedSlots: garden.slotReserved });
      }

      // Buy 1 seed
      const buyCount = BigInt(1);
      console.log("Starting seed purchase...", { seedId, buyCount, address });
      
      const txHash = await buySeedContract(
        client,
        account as Account,
        BigInt(seedId),
        buyCount,
        address
      );
      
      if (!txHash) {
        throw new Error("Transaction hash not returned. Transaction may have failed.");
      }

      // Verify transaction hash format
      if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
        throw new Error(`Invalid transaction hash: ${txHash}`);
      }
      
      console.log(`Seed ${seedId} purchased! Transaction: ${txHash}`);
      console.log(`View on BlockScout: https://sepolia-blockscout.lisk.com/tx/${txHash}`);
      
      // Now plant the seed automatically after purchase
      console.log(`Planting seed ${seedId}...`);
      try {
        const plantTxHash = await plantSeedContract(
          client,
          account as Account,
          BigInt(seedId),
          address
        );
        
        if (!plantTxHash) {
          throw new Error("Plant transaction hash not returned. Transaction may have failed.");
        }

        // Verify transaction hash format
        if (typeof plantTxHash !== 'string' || !plantTxHash.startsWith('0x')) {
          throw new Error(`Invalid plant transaction hash: ${plantTxHash}`);
        }

        console.log(`Seed ${seedId} planted! Transaction: ${plantTxHash}`);
        console.log(`View on BlockScout: https://sepolia-blockscout.lisk.com/tx/${plantTxHash}`);
        
        // Build success message with all transactions
        let successMessage = `Seed purchased and planted successfully! 🎉\n\n`;
        if (claimTxHash) {
          successMessage += `Garden Claim: ${claimTxHash.slice(0, 10)}...\n`;
        }
        successMessage += `Purchase: ${txHash.slice(0, 10)}...\n`;
        successMessage += `Plant: ${plantTxHash.slice(0, 10)}...\n\n`;
        successMessage += `View on BlockScout:\n`;
        if (claimTxHash) {
          successMessage += `Garden: https://sepolia-blockscout.lisk.com/tx/${claimTxHash}\n`;
        }
        successMessage += `Purchase: https://sepolia-blockscout.lisk.com/tx/${txHash}\n`;
        successMessage += `Plant: https://sepolia-blockscout.lisk.com/tx/${plantTxHash}`;
        
        alert(successMessage);
      } catch (plantError) {
        console.error("Error planting seed:", plantError);
        const plantErrorMessage = plantError instanceof Error ? plantError.message : "Failed to plant seed. Please try again.";
        // Still show success for purchase, but warn about planting failure
        alert(`Seed purchased successfully! Transaction: ${txHash.slice(0, 10)}...\n\nHowever, planting failed: ${plantErrorMessage}\n\nYou can plant the seed manually later.`);
      }
      
      // Refresh seeds list after purchase
      if (isVisible) {
        // Re-fetch seeds to update stock
        const seedPromises = [0, 1, 2].map(async (id) => {
          try {
            const seed = await getSeed(client, BigInt(id));
            const emoji = seed.name.toLowerCase().includes('tomato') ? '🍅' 
              : seed.name.toLowerCase().includes('carrot') ? '🥕'
              : seed.name.toLowerCase().includes('corn') ? '🌽'
              : '🌱';
            
            return {
              id: Number(seed.id),
              name: seed.name,
              emoji,
              price: `${formatEther(seed.price)} ETH`,
              growthTime: `${Number(seed.stageDuration)}s/stage`,
              depletionTime: `${Number(seed.depletionTime)} Seconds`,
              harvestReward: `${formatEther(seed.harvestReward)} ETH`,
              stock: Number(seed.stock)
            };
          } catch (error) {
            console.error(`Error fetching seed ${id}:`, error);
            return null;
          }
        });

        const fetchedSeeds = await Promise.all(seedPromises);
        const validSeeds = fetchedSeeds.filter((s): s is Seed => s !== null);
        setSeeds(validSeeds);
      }
      
      onBuySeed?.(seedId);
    } catch (error) {
      console.error("Error buying seed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to buy seed. Please try again.";
      console.error("Full error details:", error);
      alert(`Error: ${errorMessage}\n\nPlease check:\n1. You have enough ETH balance\n2. The transaction was approved in your wallet\n3. The network is Sepolia`);
    } finally {
      setLoading(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-[800px] p-6">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-3xl p-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-xl">🌱</span>
            <h2 className="text-white text-xl font-bold">
              Marketplace <span className="text-gray-400 font-normal text-base">(Plant Shop)</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seed Cards Grid */}
        <div className="grid grid-cols-1 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {loadingSeeds ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="ml-3 text-white">Loading seeds...</span>
            </div>
          ) : seeds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No seeds available</p>
            </div>
          ) : (
            seeds.map((seed) => (
            <div
              key={seed.id}
              className="bg-slate-700/60 rounded-2xl p-4 space-y-3"
            >
              {/* Seed Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{seed.emoji}</span>
                <h3 className="text-white text-lg font-semibold">{seed.name}</h3>
              </div>

              {/* Seed Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Price:</span>
                  <span className="bg-slate-600 text-white px-2 py-1 rounded-lg font-mono text-xs">
                    {seed.price}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Growth Time:</span>
                  <span className="text-white font-medium text-xs">{seed.growthTime}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Depletion Time:</span>
                  <span className="text-white font-medium text-xs">{seed.depletionTime}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Harvest Reward:</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded-lg font-mono text-xs">
                    {seed.harvestReward}
                  </span>
                </div>

                <div className="text-center pt-1">
                  <span className="text-gray-400 text-xs">Stock: {seed.stock}</span>
                </div>
              </div>

              {/* Buy Button */}
              <button
                onClick={() => handleBuySeed(seed.id)}
                disabled={loading === seed.id || seed.stock === 0}
                className="w-full bg-slate-600/60 hover:bg-slate-500/60 disabled:bg-slate-700/40 disabled:cursor-not-allowed text-white py-2 px-3 rounded-xl transition-colors font-medium text-sm"
              >
                {loading === seed.id ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Buying...
                  </div>
                ) : seed.stock === 0 ? (
                  "Out of Stock"
                ) : (
                  "Buy seed"
                )}
              </button>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
