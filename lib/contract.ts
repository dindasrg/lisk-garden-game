"use client";

import { liskSepolia, PannaClient } from "panna-sdk";
import {
  prepareContractCall,
  sendTransaction,
  readContract,
  waitForReceipt,
} from "thirdweb/transaction";
import { getContract } from "thirdweb/contract";
import type { Account } from "thirdweb/wallets";
import { toWei } from "thirdweb/utils";
import { LISK_GARDEN_CONTRACT_ADDRESS } from "@/lib/constants";
import { GrowthStage, Plant } from "@/types/contract";

// ============================================================================
// READ FUNCTIONS
// ============================================================================

/**
 * Get all plants owned by a user
 */
export async function getUserPlantList(
  client: PannaClient,
  userAddress: string
): Promise<Plant[]> {
  const contract = getContract({
    client,
    chain: liskSepolia,
    address: LISK_GARDEN_CONTRACT_ADDRESS,
  });

  const plantList = await readContract({
    contract,
    method:
      "function getUserPlantList(address plantOwner) public view returns (tuple(uint256 id, uint256 seedId, address owner, string name, uint8 stage, uint256 plantedDate, uint256 lastWatered, uint8 waterLevel, bool isExists, bool isDead)[])",
    params: [userAddress],
  });

  // Parse each plant from the array
  return (plantList as readonly unknown[]).map((rawPlant) =>
    parsePlantData(rawPlant)
  );
}

/**
 * Get seed information
 */
export async function getSeed(
  client: PannaClient,
  seedId: bigint
): Promise<{
  id: bigint;
  name: string;
  price: bigint;
  stock: bigint;
  stageDuration: bigint;
  harvestReward: bigint;
  depletionTime: bigint;
  depletionRate: number;
}> {
  const contract = getContract({
    client,
    chain: liskSepolia,
    address: LISK_GARDEN_CONTRACT_ADDRESS,
  });

  const seed = await readContract({
    contract,
    method:
      "function seeds(uint256) public view returns (uint256 id, string name, uint256 price, uint256 stock, uint256 stageDuration, uint256 harvestReward, uint256 depletionTime, uint8 depletionRate)",
    params: [seedId],
  });

  const isArray = Array.isArray(seed);
  const getBigInt = (idx: number): bigint => {
    const value = isArray
      ? (seed as unknown[])[idx]
      : Object.values(seed as unknown as Record<string, unknown>)[idx];
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    return BigInt(0);
  };
  const getString = (idx: number): string => {
    const value = isArray
      ? (seed as unknown[])[idx]
      : Object.values(seed as unknown as Record<string, unknown>)[idx];
    return String(value ?? "");
  };
  const getNumber = (idx: number): number => {
    const value = isArray
      ? (seed as unknown[])[idx]
      : Object.values(seed as unknown as Record<string, unknown>)[idx];
    if (typeof value === "number") return value;
    if (typeof value === "bigint") return Number(value);
    return 0;
  };

  return {
    id: getBigInt(0),
    name: getString(1),
    price: getBigInt(2),
    stock: getBigInt(3),
    stageDuration: getBigInt(4),
    harvestReward: getBigInt(5),
    depletionTime: getBigInt(6),
    depletionRate: getNumber(7),
  };
}

/**
 * Calculate water level for a plant
 */
export async function calculateWaterLevel(
  client: PannaClient,
  plantId: bigint,
  plantOwner: string
): Promise<number> {
  const contract = getContract({
    client,
    chain: liskSepolia,
    address: LISK_GARDEN_CONTRACT_ADDRESS,
  });

  const waterLevel = await readContract({
    contract,
    method:
      "function calculateWaterLevel(uint256 plantId, address plantOwner) public view returns (uint8)",
    params: [plantId, plantOwner],
  });

  return Number(waterLevel);
}

/**
 * Get garden information for a user
 */
export async function getGarden(
  client: PannaClient,
  gardenOwner: string
): Promise<{
  id: bigint;
  owner: string;
  totalSlot: bigint;
  slotReserved: bigint;
  establishedDate: bigint;
} | null> {
  const contract = getContract({
    client,
    chain: liskSepolia,
    address: LISK_GARDEN_CONTRACT_ADDRESS,
  });

  const garden = await readContract({
    contract,
    method:
      "function gardens(address) public view returns (uint256 id, address owner, uint256 totalSlot, uint256 slotReserved, uint256 establishedDate)",
    params: [gardenOwner],
  });

  const isArray = Array.isArray(garden);
  const id = BigInt(
    isArray
      ? (garden as unknown[])[0] ?? 0
      : (garden as { id?: bigint }).id ?? 0
  );

  // If id is 0, garden doesn't exist
  if (id === BigInt(0)) return null;

  return {
    id,
    owner: String(
      isArray
        ? (garden as unknown[])[1] ?? ""
        : (garden as { owner?: string }).owner ?? ""
    ),
    totalSlot: (() => {
      const value = isArray
        ? (garden as unknown[])[2]
        : (garden as { totalSlot?: bigint }).totalSlot;
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(value);
      return BigInt(0);
    })(),
    slotReserved: (() => {
      const value = isArray
        ? (garden as unknown[])[3]
        : (garden as { slotReserved?: bigint }).slotReserved;
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(value);
      return BigInt(0);
    })(),
    establishedDate: (() => {
      const value = isArray
        ? (garden as unknown[])[4]
        : (garden as { establishedDate?: bigint }).establishedDate;
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(value);
      return BigInt(0);
    })(),
  };
}

// ============================================================================
// WRITE FUNCTIONS
// ============================================================================

/**
 * Claim a new garden
 */
export async function claimGarden(
  client: PannaClient,
  account: Account,
  gardenOwner: string
): Promise<string> {
  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method: "function claimGarden(address gardenOwner) public returns (uint256)",
    params: [gardenOwner],
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

/**
 * Upgrade garden slots (costs 0.002 ETH)
 */
export async function upgradeGarden(
  client: PannaClient,
  account: Account,
  gardenOwner: string
): Promise<string> {
  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method:
      "function upgradeGarden(address gardenOwner) public payable returns (uint256)",
    params: [gardenOwner],
    value: toWei("0.002"),
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

/**
 * Buy seeds
 */
export async function buySeed(
  client: PannaClient,
  account: Account,
  seedId: bigint,
  buyCount: bigint,
  gardenOwner: string
): Promise<string> {
  const seed = await getSeed(client, seedId);
  const totalPrice = seed.price * buyCount;

  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method:
      "function buySeed(uint256 seedId, uint256 buyCount, address gardenOwner) public payable returns (uint256)",
    params: [seedId, buyCount, gardenOwner],
    value: totalPrice,
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

/**
 * Plant a seed
 */
export async function plantSeed(
  client: PannaClient,
  account: Account,
  seedId: bigint,
  gardenOwner: string
): Promise<string> {
  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method:
      "function plantSeed(uint256 seedId, address gardenOwner) public payable returns (uint256)",
    params: [seedId, gardenOwner],
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

/**
 * Update plant stage
 */
export async function updatePlantStage(
  client: PannaClient,
  account: Account,
  plantId: bigint,
  plantOwner: string
): Promise<string> {
  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method:
      "function updatePlantStage(uint256 plantId, address plantOwner) public",
    params: [plantId, plantOwner],
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

/**
 * Water a plant
 */
export async function waterPlant(
  client: PannaClient,
  account: Account,
  plantId: bigint,
  plantOwner: string
): Promise<string> {
  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method: "function waterPlant(uint256 plantId, address plantOwner) public",
    params: [plantId, plantOwner],
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

/**
 * Harvest a plant
 */
export async function harvestPlant(
  client: PannaClient,
  account: Account,
  plantId: bigint,
  plantOwner: string
): Promise<string> {
  const tx = prepareContractCall({
    contract: getContract({
      client,
      chain: liskSepolia,
      address: LISK_GARDEN_CONTRACT_ADDRESS,
    }),
    method: "function harvestPlant(uint256 plantId, address plantOwner) public",
    params: [plantId, plantOwner],
  });

  const result = await sendTransaction({
    account,
    transaction: tx,
  });

  await waitForReceipt(result);
  return result.transactionHash;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if plant stage is out of sync (on-chain stage < expected stage)
 * Note: This calculation now depends on seed-specific stageDuration
 */
export function isStageOutOfSync(plant: Plant, seedStageDuration: bigint): boolean {
  if (plant.isDead || !plant.isExists) return false;
  const expectedStage = getExpectedStage(plant, seedStageDuration);
  return plant.stage < expectedStage;
}

/**
 * Calculate expected stage based on time (what stage the plant SHOULD be at)
 * Stages advance based on seed-specific stageDuration:
 * - SPROUT: after 1x stageDuration
 * - GROWING: after 2x stageDuration
 * - BLOOMING: after 3x stageDuration
 */
export function getExpectedStage(
  plant: Plant,
  seedStageDuration: bigint
): GrowthStage {
  if (plant.isDead || !plant.isExists) return plant.stage;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const planted = plant.plantedDate;
  const timePassed = now - planted;

  // Calculate which stage based on time
  // Stages advance: SPROUT after 1x, GROWING after 2x, BLOOMING after 3x
  if (timePassed <= seedStageDuration) {
    return GrowthStage.SEED;
  } else if (timePassed > seedStageDuration * BigInt(3)) {
    return GrowthStage.BLOOMING;
  } else if (timePassed > seedStageDuration * BigInt(2)) {
    return GrowthStage.GROWING;
  } else {
    return GrowthStage.SPROUT;
  }
}

/**
 * Convert raw contract plant data to typed Plant interface
 */
export function parsePlantData(rawPlant: unknown): Plant {
  const isArray = Array.isArray(rawPlant);

  const getBigIntValue = (value: unknown, fallback: number = 0): bigint => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    return BigInt(fallback);
  };

  const getNumberValue = (value: unknown, fallback: number = 0): number => {
    if (typeof value === "number") return value;
    if (typeof value === "bigint") return Number(value);
    return fallback;
  };

  const getStringValue = (value: unknown, fallback: string = ""): string => {
    if (typeof value === "string") return value;
    return fallback;
  };

  const getBooleanValue = (
    value: unknown,
    fallback: boolean = false
  ): boolean => {
    if (typeof value === "boolean") return value;
    return fallback;
  };

  // Plant struct: (uint256 id, uint256 seedId, address owner, string name, uint8 stage, uint256 plantedDate, uint256 lastWatered, uint8 waterLevel, bool isExists, bool isDead)
  return {
    id: getBigIntValue(
      isArray
        ? (rawPlant as unknown[])[0]
        : (rawPlant as { id?: bigint }).id
    ),
    seedId: getBigIntValue(
      isArray
        ? (rawPlant as unknown[])[1]
        : (rawPlant as { seedId?: bigint }).seedId
    ),
    owner: getStringValue(
      isArray
        ? (rawPlant as unknown[])[2]
        : (rawPlant as { owner?: string }).owner
    ),
    name: getStringValue(
      isArray
        ? (rawPlant as unknown[])[3]
        : (rawPlant as { name?: string }).name
    ),
    stage: getNumberValue(
      isArray
        ? (rawPlant as unknown[])[4]
        : (rawPlant as { stage?: number }).stage
    ) as GrowthStage,
    plantedDate: getBigIntValue(
      isArray
        ? (rawPlant as unknown[])[5]
        : (rawPlant as { plantedDate?: bigint }).plantedDate
    ),
    lastWatered: getBigIntValue(
      isArray
        ? (rawPlant as unknown[])[6]
        : (rawPlant as { lastWatered?: bigint }).lastWatered
    ),
    waterLevel: getNumberValue(
      isArray
        ? (rawPlant as unknown[])[7]
        : (rawPlant as { waterLevel?: number }).waterLevel
    ),
    isExists: getBooleanValue(
      isArray
        ? (rawPlant as unknown[])[8]
        : (rawPlant as { exists?: boolean; isExists?: boolean }).isExists ??
          (rawPlant as { exists?: boolean; isExists?: boolean }).exists
    ),
    isDead: getBooleanValue(
      isArray
        ? (rawPlant as unknown[])[9]
        : (rawPlant as { isDead?: boolean }).isDead
    ),
  };
}
