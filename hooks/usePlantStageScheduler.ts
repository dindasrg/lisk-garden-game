'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useContract } from './useContract'
import { usePlants } from './usePlants'
import { updatePlantStage as updatePlantStageContract, isStageOutOfSync } from '@/lib/contract'
import { GrowthStage } from '@/types/contract'
import type { Account } from 'thirdweb/wallets'

/**
 * Background scheduler that automatically updates plant stages every minute
 * Runs for all user's plants that need stage updates
 */
export function usePlantStageScheduler() {
  const { client, account, isConnected } = useContract()
  const { plants } = usePlants()
  const isProcessingRef = useRef(false)

  const updatePlantsStages = useCallback(async () => {
    // Skip if already processing or not connected
    if (isProcessingRef.current || !client || !account || !isConnected) {
      return
    }

    // Type guard: ensure account is a full Account (not just { address: string })
    // Mock accounts don't have the required methods, so skip updates for them
    if (!('sendTransaction' in account) || !('signMessage' in account)) {
      return
    }

    // Skip if no plants
    if (plants.length === 0) {
      return
    }

    isProcessingRef.current = true

    try {
      // Filter plants that need stage updates
      const plantsNeedingUpdate = plants.filter((plant) => {
        // Skip dead plants
        if (plant.isDead || !plant.isExists) return false

        // Skip plants already at max stage
        if (plant.stage === GrowthStage.BLOOMING) return false

        // Only update if stage is out of sync
        return isStageOutOfSync(plant)
      })

      if (plantsNeedingUpdate.length === 0) {
        return
      }

      // Update each plant sequentially to avoid nonce conflicts
      for (const plant of plantsNeedingUpdate) {
        try {
          // Type assertion is safe here because we checked above
          await updatePlantStageContract(client, account as Account, plant.id)
        } catch (err) {
          // Continue with next plant even if one fails
        }
      }
    } catch (err) {
      // Silently handle scheduler errors
    } finally {
      isProcessingRef.current = false
    }
  }, [client, account, isConnected, plants])

  // Set up interval to run every minute
  useEffect(() => {
    if (!isConnected || plants.length === 0) {
      return
    }

    // Run immediately on mount
    updatePlantsStages()

    // Then run every minute
    const intervalId = setInterval(() => {
      updatePlantsStages()
    }, 60000) // 60 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [isConnected, plants.length, updatePlantsStages])

  return {
    isRunning: isConnected && plants.length > 0,
  }
}
