'use client'

import Image from "next/image";
import { Plus, Lock, Leaf } from "lucide-react";

interface GardenSlotProps {
  type: 'add' | 'locked' | 'plant' | 'empty';
  plantType?: 'carrot' | 'tomato' | 'corn';
  onClick?: () => void;
}

function GardenSlot({ type, plantType, onClick }: GardenSlotProps) {
  const getIcon = () => {
    switch (type) {
      case 'add':
        return <Plus className="w-8 h-8 text-white" />;
      case 'locked':
        return <Lock className="w-8 h-8 text-black" />;
      case 'plant':
        return <Leaf className="w-8 h-8 text-green-400" />;
      default:
        return null;
    }
  };

  const isClickable = type === 'add' || type === 'plant';

  return (
    <div className="relative flex items-center justify-center">
      {/* Garden Vector Background */}
      <Image
        src="/garden-vector.svg"
        alt="Garden Slot"
        width={80}
        height={80}
        className="w-20 h-20"
      />
      
      {/* Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isClickable ? (
          <button
            onClick={onClick}
            className="flex items-center justify-center w-full h-full transition-transform hover:scale-110"
          >
            {getIcon()}
          </button>
        ) : (
          <div className="flex items-center justify-center">
            {getIcon()}
          </div>
        )}
      </div>
    </div>
  );
}

interface GardenProps {
  onAddPlant?: () => void;
  onPlantClick?: (plantId: string) => void;
  hideSlots?: boolean;
  isBackground?: boolean;
}

export function Garden({ onAddPlant, onPlantClick, hideSlots = false, isBackground = false }: GardenProps) {
  // Initial garden layout - 3 slots as requested
  const gardenSlots = [
    { id: 'slot-1', type: 'add' as const },
    { id: 'slot-2', type: 'locked' as const },
    { id: 'slot-3', type: 'plant' as const, plantType: 'carrot' as const },
  ];

  return (
    <div className={`flex items-center justify-center min-h-[400px] transition-all duration-500 ${
      isBackground ? 'absolute left-0 top-1/2 -translate-y-1/2 z-0 scale-75 opacity-40' : 'relative z-10'
    }`}>
      <div className="relative">
        {/* Floating Island Background */}
        <Image
          src="/island.svg"
          alt="Floating Island"
          width={800}
          height={800}
          className={`drop-shadow-2xl floating-island transition-all duration-500 ${
            isBackground ? 'w-[800px] h-[800px]' : 'w-[800px] h-[800px]'
          }`}
        />
        
        {/* Garden Slots Overlay - Hidden when marketplace is shown */}
        {!hideSlots && (
          <div className="absolute top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-8 transition-opacity duration-500">
            <div className="relative">
              {/* Hexagonal Layout */}
              <div className="flex flex-col items-center gap-4">
                {/* Top row - 1 slot */}
                <div className="flex justify-center">
                  <GardenSlot
                    type={gardenSlots[0].type}
                    plantType={gardenSlots[0].plantType}
                    onClick={() => {
                      if (gardenSlots[0].type === 'add') {
                        onAddPlant?.();
                      } else if (gardenSlots[0].type === 'plant') {
                        onPlantClick?.(gardenSlots[0].id);
                      }
                    }}
                  />
                </div>
                
                {/* Middle row - 2 slots */}
                <div className="flex gap-8">
                  <GardenSlot
                    type={gardenSlots[1].type}
                    plantType={gardenSlots[1].plantType}
                    onClick={() => {
                      if (gardenSlots[1].type === 'add') {
                        onAddPlant?.();
                      } else if (gardenSlots[1].type === 'plant') {
                        onPlantClick?.(gardenSlots[1].id);
                      }
                    }}
                  />
                  <GardenSlot
                    type={gardenSlots[2].type}
                    plantType={gardenSlots[2].plantType}
                    onClick={() => {
                      if (gardenSlots[2].type === 'add') {
                        onAddPlant?.();
                      } else if (gardenSlots[2].type === 'plant') {
                        onPlantClick?.(gardenSlots[2].id);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
