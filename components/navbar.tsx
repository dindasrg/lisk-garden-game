'use client'

import Image from "next/image";
import { useContract } from "@/hooks/useContract";
import { LoginButton, useActiveAccount, liskSepolia } from "panna-sdk";

export function Navbar() {
  const { isConnected, address } = useContract();

  const handleConnectWallet = () => {
  };

  return (
    <nav className="relative z-10 flex justify-between items-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image
          src="/lisk-garden-logo.svg"
          alt="LiskGarden Logo"
          width={40}
          height={40}
          className="w-10 h-10"
        />
        <span className="text-white font-bold text-xl">LiskGarden</span>
      </div>
      
      {/* Connect Wallet Button */}
      {!isConnected ? (
        // <button 
        //   onClick={handleConnectWallet}
        //   className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg"
        // >
        //   <span>🔗</span>
        //   Connect Wallet
        // </button>
        <LoginButton chain={liskSepolia} />
      ) : (
        <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-white font-mono text-sm">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}
          </span>
        </div>
      )}
    </nav>
  );
}
