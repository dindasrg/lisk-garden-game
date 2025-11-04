'use client'

import { useMemo } from 'react'
import { useActiveAccount, usePanna } from 'panna-sdk'
import { LISK_GARDEN_CONTRACT_ADDRESS } from '@/lib/constants'

/**
 * Hook to get the Panna client and active account
 * Returns client, account, and wallet connection status
 */
export function useContract() {
  const activeAccount = useActiveAccount()
  const { client } = usePanna()

  const contractInfo = useMemo(() => {
    const mockAddress = process.env.NEXT_PUBLIC_MOCK_ADDRESS
    if (mockAddress) {
        return {
          client: client ?? null,                  // was: (client) || ({})
          account: { address: mockAddress }, // was: ({ ... } as any) || null
          isConnected: true,
          address: mockAddress,
          contractAddress: LISK_GARDEN_CONTRACT_ADDRESS,
        }
      }
    return {
      client: client || null,
      account: activeAccount || null,
      isConnected: !!activeAccount && !!client,
      address: activeAccount?.address || null,
      contractAddress: LISK_GARDEN_CONTRACT_ADDRESS,
    }
  }, [activeAccount, client])

  return contractInfo
}
