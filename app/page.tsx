'use client'

import { getUserPlantList } from "@/lib/contract";
import { useContract } from "@/hooks/useContract";
import { useEffect } from "react";

export default function Home() {
  const { client, account, isConnected, address } = useContract();
  useEffect(() => {
    console.log("client", client);
    console.log("address", address);
    if (!client || !address) return;
    (async () => {  
      const plants = await getUserPlantList(client, address || "");
      console.log("plants", plants);
    })();
  }, [client, address]);
  return <div>Hello World</div>;
}
