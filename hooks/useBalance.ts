'use client'

import { useState, useEffect } from 'react'
import { useContract } from './useContract'
import { liskSepolia } from 'panna-sdk'
import { getRpcClient } from 'thirdweb'

/**
 * Hook to get the account balance
 * Returns balance in ETH as a formatted string
 */
export function useBalance() {
  const { client, address, isConnected } = useContract()
  const [balance, setBalance] = useState<string>('0.00')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchBalance = async () => {
      if (!client || !address || !isConnected) {
        setBalance('0.00')
        return
      }

      setLoading(true)
      try {
        const rpcClient = getRpcClient({ client, chain: liskSepolia })
        const balanceWei = await rpcClient({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        })

        // Convert from Wei to ETH (balanceWei is a hex string)
        const balanceBigInt = BigInt(balanceWei as string)
        const balanceEth = Number(balanceBigInt) / 1e18
        setBalance(balanceEth.toFixed(4))
      } catch (error) {
        console.error('Error fetching balance:', error)
        setBalance('0.00')
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000)

    return () => clearInterval(interval)
  }, [client, address, isConnected])

  return { balance, loading }
}

