'use client'

import { useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { WalletSidebar } from "@/components/wallet-sidebar";
import { Garden } from "@/components/garden";
import { MarketplaceCard } from "@/components/marketplace-card";
import { MyGarden } from "@/components/my-garden";

type View = 'garden' | 'marketplace' | 'my-garden';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('garden');

  // Mock data for now - will be replaced with real data later
  const mockData = {
    activePlants: 2,
    totalRewards: "0.03"
  };

  const handleAddPlant = () => {
    setCurrentView('marketplace');
  };

  const handlePlantClick = (plantId: string) => {
    console.log("Plant clicked:", plantId);
  };

  const handleBuySeed = (seedId: number) => {
    console.log("Seed purchased:", seedId);
    // After buying, close marketplace
    setCurrentView('garden');
  };

  const handleCloseMarketplace = () => {
    setCurrentView('garden');
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/lisk-garden-bg.svg"
          alt="Garden Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="relative z-10 flex h-[calc(100vh-120px)]">
        {/* Floating Island Background (behind wallet card when marketplace is shown) */}
        {currentView === 'marketplace' && (
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Garden 
                onAddPlant={handleAddPlant}
                onPlantClick={handlePlantClick}
                hideSlots={true}
                isBackground={true}
              />
            </div>
          </div>
        )}

        {/* Left Sidebar - Wallet Info */}
        <div className="relative z-20">
          <WalletSidebar 
            activePlants={mockData.activePlants}
            totalRewards={mockData.totalRewards}
            currentView={currentView}
            onViewChange={handleViewChange}
          />
        </div>

        {/* Center - Content based on current view */}
        {currentView === 'garden' && (
          <div className="flex-1 flex items-center justify-center">
            <Garden 
              onAddPlant={handleAddPlant}
              onPlantClick={handlePlantClick}
              hideSlots={false}
              isBackground={false}
            />
          </div>
        )}

        {currentView === 'my-garden' && (
          <MyGarden onAddPlant={handleAddPlant} />
        )}

        {/* Right Side - Marketplace Card */}
        <div className={`relative z-20 transition-all duration-500 ${
          currentView === 'marketplace' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
          <MarketplaceCard
            isVisible={currentView === 'marketplace'}
            onClose={handleCloseMarketplace}
            onBuySeed={handleBuySeed}
          />
        </div>
      </div>
    </div>
  );
}
