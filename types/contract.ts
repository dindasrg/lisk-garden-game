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

export const LISK_GARDEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
