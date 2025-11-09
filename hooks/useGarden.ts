'use client'

import { useState, useEffect, useCallback } from 'react'
import { useContract } from './useContract'
import { getGarden, getUpgradeGardenCost } from '@/lib/contract'

export interface GardenDetails {
  id: bigint
  owner: string
  totalSlot: bigint
  slotReserved: bigint
  establishedDate: bigint
}

/**
 * Hook to manage user's garden details
 * Fetches garden from contract and provides garden information
 */
export function useGarden() {
  const { client, isConnected, address } = useContract()
  const [garden, setGarden] = useState<GardenDetails | null>(null)
  const [upgradeCost, setUpgradeCost] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch garden details
  const fetchGarden = useCallback(async (silent = false) => {
    if (!client || !address) {
      setGarden(null)
      return
    }

    if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      const gardenData = await getGarden(client, address)
      setGarden(gardenData)

      // Also fetch upgrade cost
      if (gardenData) {
        const cost = await getUpgradeGardenCost(client)
        setUpgradeCost(cost)
      }
    } catch (err) {
      console.error('Error fetching garden:', err)
      setError(err as Error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [client, address])

  // Check if garden slots are full
  const isSlotsFull = useCallback((): boolean => {
    if (!garden) return false
    return garden.slotReserved >= garden.totalSlot
  }, [garden])

  // Get available slots
  const getAvailableSlots = useCallback((): bigint => {
    if (!garden) return BigInt(0)
    const available = garden.totalSlot - garden.slotReserved
    return available > BigInt(0) ? available : BigInt(0)
  }, [garden])

  // Auto-fetch garden when connected
  useEffect(() => {
    if (isConnected && address) {
      fetchGarden()
    }
  }, [isConnected, address, fetchGarden])

  // Auto-refresh data every 5 seconds (silent mode for seamless updates)
  useEffect(() => {
    if (!isConnected || !address) {
      return
    }

    const intervalId = setInterval(() => {
      fetchGarden(true) // true = silent mode (no loading state)
    }, 5000)

    return () => clearInterval(intervalId)
  }, [isConnected, address, fetchGarden])

  return {
    garden,
    upgradeCost,
    loading,
    error,
    fetchGarden,
    isSlotsFull,
    getAvailableSlots,
  }
}

