'use client'

import { PannaProvider } from 'panna-sdk'

export function Providers({ children }: { children: React.ReactNode }) {
  // Provide default values to prevent runtime errors during development
  const clientId = process.env.NEXT_PUBLIC_PANNA_CLIENT_ID || 'dev-client-id'
  const partnerId = process.env.NEXT_PUBLIC_PANNA_PARTNER_ID || 'dev-partner-id'

  return (
    <PannaProvider
      clientId={clientId}
      partnerId={partnerId}
    >
      {children}
    </PannaProvider>
  )
}


