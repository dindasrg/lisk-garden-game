'use client'

import { PannaProvider } from 'panna-sdk'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PannaProvider
      clientId={process.env.NEXT_PUBLIC_PANNA_CLIENT_ID}
      partnerId={process.env.NEXT_PUBLIC_PANNA_PARTNER_ID}
    >
      {children}
    </PannaProvider>
  )
}


