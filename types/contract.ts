export interface Plant {
  id: bigint;
  seedId: bigint;
  owner: string;
  name: string;
  stage: GrowthStage;
  plantedDate: bigint;
  lastWatered: bigint;
  waterLevel: number;
  isExists: boolean;
  isDead: boolean;
}

export enum GrowthStage {
  SEED = 0,
  SPROUT = 1,
  GROWING = 2,
  BLOOMING = 3,
}

// Contract constants
export const PLANT_PRICE = '0.001' // ETH
export const HARVEST_REWARD = '0.003' // ETH
export const STAGE_DURATION = 60 // 1 minute in seconds
export const WATER_DEPLETION_TIME = 30 // 30 seconds - how often water depletes
export const WATER_DEPLETION_RATE = 20 // 20% - how much water is lost per interval


export const LISK_GARDEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
