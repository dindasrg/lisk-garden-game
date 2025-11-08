'use client'

import { useState, useEffect, useCallback } from 'react'
import { useContract } from './useContract'
import {
  getUserPlantList,
  plantSeed as plantSeedContract,
  waterPlant as waterPlantContract,
  harvestPlant as harvestPlantContract,
  updatePlantStage as updatePlantStageContract,
  isStageOutOfSync,
} from '@/lib/contract'
import { Plant } from '@/types/contract'
import type { Account } from 'thirdweb/wallets'
import { useToast } from '@/hooks/use-toast'

/**
 * Hook to manage user's plants (simplified workshop version)
 * Fetches plants from contract and provides plant operations using Panna SDK
 */

export function usePlants() {
  const { client, account, isConnected, address } = useContract()
  const { toast } = useToast()
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch user's plants (with optional silent mode for auto-refresh)
  const fetchPlants = useCallback(async (silent = false) => {
    if (!client || !address) {
      setPlants([])
      return
    }

    // Only show loading state when not silent (user-initiated actions)
    if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      // Get user's plants - getUserPlantList already returns Plant[] directly
      const userPlants = await getUserPlantList(client, address)

      console.log("userPlants", userPlants)

      // Filter out plants that don't exist
      const validPlants = userPlants.filter((plant) => plant.isExists)

      console.log("valid plants", validPlants)

      setPlants(validPlants)
    } catch (err) {
      console.error('Error fetching plants:', err)
      setError(err as Error)
      // Only show error toast when not silent
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to fetch your plants. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [client, address, toast])

  // Plant a new seed (simplified - no plant type)
  const plantSeed = useCallback(async (seedId: bigint = BigInt(0)) => {
    if (!client || !account || !address) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      })
      return
    }

    // Type guard: ensure account is a full Account
    if (!('sendTransaction' in account) || !('signMessage' in account)) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Send transaction and wait for receipt
      await plantSeedContract(client, account as Account, seedId, address)

      toast({
        title: 'Seed planted!',
        description: 'Your plant has been created successfully. Cost: 0.001 ETH',
      })

      // Transaction is confirmed, refresh plants immediately
      await fetchPlants()
    } catch (err: unknown) {
      console.error('Error planting seed:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to plant seed. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [client, account, toast, fetchPlants])

  // Water a plant (simplified - no watering level)
  const waterPlant = useCallback(
    async (plantId: bigint) => {
      if (!client || !account) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        })
        return
      }

      // Type guard: ensure account is a full Account
      if (!('sendTransaction' in account) || !('signMessage' in account)) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        })
        return
      }

      if (!address) {
        throw new Error('Address not available')
      }

      setLoading(true)
      try {
        // Check if stage needs updating - get fresh plant data
        const userPlants = await getUserPlantList(client, address)
        const plant = userPlants.find((p) => p.id === plantId)
        
        if (!plant) {
          throw new Error('Plant not found')
        }
        
        // Note: isStageOutOfSync requires seedStageDuration, but we'll skip this check for now
        // since we don't have seed info. The contract will handle stage updates.
        const needsStageUpdate = false // Simplified - contract handles stage updates

        if (needsStageUpdate) {
          toast({
            title: 'Syncing stage...',
            description: 'Updating plant stage first, then watering.',
          })
          await updatePlantStageContract(client, account as Account, plantId, address)
        }

        // Send transaction and wait for receipt
        await waterPlantContract(client, account as Account, plantId, address)

        toast({
          title: 'Plant watered!',
          description: needsStageUpdate
            ? 'Stage synced and plant watered successfully!'
            : 'Your plant has been watered successfully. FREE - gas only!',
        })

        // Transaction is confirmed, refresh plants immediately
        await fetchPlants()
      } catch (err: unknown) {
        console.error('Error watering plant:', err)
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to water plant. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [client, account, toast, fetchPlants]
  )

  // Harvest a plant
  const harvestPlant = useCallback(
    async (plantId: bigint) => {
      if (!client || !account) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        })
        return
      }

      // Type guard: ensure account is a full Account
      if (!('sendTransaction' in account) || !('signMessage' in account)) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        })
        return
      }

      if (!address) {
        throw new Error('Address not available')
      }

      setLoading(true)
      try {
        // Check if stage needs updating before harvest - get fresh plant data
        const userPlants = await getUserPlantList(client, address)
        const plant = userPlants.find((p) => p.id === plantId)
        
        if (!plant) {
          throw new Error('Plant not found')
        }
        
        // Note: isStageOutOfSync requires seedStageDuration, but we'll skip this check for now
        // since we don't have seed info. The contract will handle stage updates.
        const needsStageUpdate = false // Simplified - contract handles stage updates

        if (needsStageUpdate) {
          toast({
            title: 'Syncing stage...',
            description: 'Updating plant to blooming stage before harvest.',
          })
          await updatePlantStageContract(client, account as Account, plantId, address)
        }

        // Send transaction and wait for receipt
        await harvestPlantContract(client, account as Account, plantId, address)

        toast({
          title: 'Plant harvested!',
          description: needsStageUpdate
            ? 'Stage synced and harvested successfully! You received 0.003 ETH 🎉'
            : 'You received 0.003 ETH reward! 🎉',
        })

        // Transaction is confirmed, refresh plants immediately
        await fetchPlants()
      } catch (err: unknown) {
        console.error('Error harvesting plant:', err)
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to harvest plant. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [client, account, toast, fetchPlants]
  )

  // Update plant stage manually
  const updatePlantStage = useCallback(
    async (plantId: bigint) => {
      if (!client || !account) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        })
        return
      }

      // Type guard: ensure account is a full Account
      if (!('sendTransaction' in account) || !('signMessage' in account)) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        })
        return
      }

      if (!address) {
        throw new Error('Address not available')
      }

      setLoading(true)
      try {
        // Send transaction and wait for receipt
        await updatePlantStageContract(client, account as Account, plantId, address)

        toast({
          title: 'Stage updated!',
          description: 'Plant stage has been synchronized with blockchain.',
        })

        // Transaction is confirmed, refresh plants immediately
        await fetchPlants()
      } catch (err: unknown) {
        console.error('Error updating plant stage:', err)
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to update plant stage. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [client, account, toast, fetchPlants]
  )

  // Auto-fetch plants when connected
  useEffect(() => {
    if (isConnected && address) {
      fetchPlants()
    }
  }, [isConnected, address, fetchPlants])

  // Auto-refresh data every 5 seconds (silent mode for seamless updates)
  useEffect(() => {
    if (!isConnected || !address) {
      return
    }

    // Set up interval to refetch every 5 seconds in silent mode
    const intervalId = setInterval(() => {
      fetchPlants(true) // true = silent mode (no loading state)
    }, 5000)

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId)
  }, [isConnected, address, fetchPlants])

  return {
    plants,
    loading,
    error,
    fetchPlants,
    plantSeed,
    waterPlant,
    harvestPlant,
    updatePlantStage,
  }
}
