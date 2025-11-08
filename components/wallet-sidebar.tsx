'use client'

import { useContract } from "@/hooks/useContract";
import { useBalance } from "@/hooks/useBalance";
import { Wallet, Sprout, HandCoins, ShoppingCart, Home } from "lucide-react";

type View = 'garden' | 'marketplace' | 'my-garden';

interface WalletSidebarProps {
  activePlants?: number;
  totalRewards?: string;
  currentView?: View;
  onViewChange?: (view: View) => void;
}

export function WalletSidebar({ 
  activePlants = 2, 
  totalRewards = "0.03",
  currentView = 'garden',
  onViewChange
}: WalletSidebarProps) {
  const { address } = useContract();
  const { balance, loading: balanceLoading } = useBalance();

  return (
    <div className="w-80 p-6">
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-3xl p-4 text-white space-y-4">
        {/* Wallet Address Card */}
        <div className="bg-slate-700/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-mono text-sm">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "0x9b8097tHG...aJ67M"}
          </span>
        </div>

        {/* ETH Balance Card */}
        <div className="bg-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-gradient-to-b from-blue-400 to-purple-600 rounded-sm transform rotate-45"></div>
            </div>
            {balanceLoading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-2xl font-bold text-white">{balance}</span>
            )}
          </div>
          <span className="text-gray-300 font-medium">ETH</span>
        </div>

        {/* Total Active Plants Card */}
        <div className="bg-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">{activePlants}</span>
          </div>
          <span className="text-gray-300 text-sm">Total active plants</span>
        </div>

        {/* Total Rewards Card */}
        <div className="bg-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <HandCoins className="w-4 h-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">{totalRewards}</span>
          </div>
          <span className="text-gray-300 text-sm">Total rewards earned</span>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onViewChange?.('marketplace')}
            className={`rounded-2xl p-4 transition-colors flex flex-col items-center gap-2 ${
              currentView === 'marketplace' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-slate-700/60 hover:bg-slate-600/60'
            }`}
          >
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-white text-sm font-medium">Marketplace</span>
          </button>
          <button 
            onClick={() => onViewChange?.('my-garden')}
            className={`rounded-2xl p-4 transition-colors flex flex-col items-center gap-2 ${
              currentView === 'my-garden' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-slate-700/60 hover:bg-slate-600/60'
            }`}
          >
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-white text-sm font-medium">My Garden</span>
          </button>
        </div>
      </div>
    </div>
  );
}
