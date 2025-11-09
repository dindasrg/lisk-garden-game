export const LISK_GARDEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const SEED_MARKET = [
  {
    id: 0,
    name: "Carrot",
    price: 0.0001,
    stock: 10,
    stageDuration: 30,
    harvestReward: 0.0002,
    depletionTime: 30,
    depletionRate: 2,
  },
  {
    id: 1,
    name: "Tomato",
    price: 0.0002,
    stock: 4,
    stageDuration: 1,
    harvestReward: 0.0004,
    depletionTime: 45,
    depletionRate: 2,
  },
  {
    id: 2,
    name: "Corn",
    price: 0.0005,
    stock: 1,
    stageDuration: 4,
    harvestReward: 0.001,
    depletionTime: 1,
    depletionRate: 3,
  },
];
