'use client'

import { useState, useEffect } from 'react'
import { useContract } from './useContract'
import { getRewardsEarned } from '@/lib/contract'

// Helper function to format bigint to ether string
function formatEther(value: bigint): string {
  const divisor = BigInt(10 ** 18)
  const whole = value / divisor
  const remainder = value % divisor
  const decimals = Number(remainder) / Number(divisor)
  return (Number(whole) + decimals).toFixed(6).replace(/\.?0+$/, '')
}

/**
 * Hook to get the total rewards earned by the user
 * Returns rewards in ETH as a formatted string
 */
export function useRewards() {
  const { client, address, isConnected } = useContract()
  const [rewards, setRewards] = useState<string>('0.00')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchRewards = async () => {
      if (!client || !address || !isConnected) {
        setRewards('0.00')
        return
      }

      setLoading(true)
      try {
        const rewardsBigInt = await getRewardsEarned(client, address)
        const formattedRewards = formatEther(rewardsBigInt)
        setRewards(formattedRewards)
      } catch (error) {
        console.error('Error fetching rewards:', error)
        setRewards('0.00')
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()

    // Refresh rewards every 5 seconds
    const interval = setInterval(fetchRewards, 5000)

    return () => clearInterval(interval)
  }, [client, address, isConnected])

  return { rewards, loading }
}

