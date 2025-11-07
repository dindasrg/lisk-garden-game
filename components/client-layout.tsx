'use client'

import GardenHeader from "@/components/garden-header";
import { usePlantStageScheduler } from "@/hooks/usePlantStageScheduler";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isRunning } = usePlantStageScheduler();
  
  return (
    <>
      <GardenHeader schedulerRunning={isRunning} />
      {children}
    </>
  );
}

