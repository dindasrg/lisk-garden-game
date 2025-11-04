'use client'

import { liskSepolia, PannaClient } from "panna-sdk";
import { readContract } from "thirdweb/transaction";
import { getContract } from "thirdweb/contract";
import { LISK_GARDEN_CONTRACT_ADDRESS } from "@/lib/constants";

export async function getUserPlantList(client: PannaClient, userAddress: string) {
  const contract = getContract({
    client,
    chain: liskSepolia,
    address: LISK_GARDEN_CONTRACT_ADDRESS,
  });
  const plantList = await readContract({
    contract,
    method: "function getUserPlantList(address userAddress) public view returns ((uint256,uint256,address,string,uint8,uint256,uint256,uint8,bool,bool)[])",
    params: [userAddress],
  });
  
  return plantList;
}
