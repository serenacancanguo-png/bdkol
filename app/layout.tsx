import type { Metadata } from 'next'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'BD KOL Analytics - Web3 Creator Intelligence',
  description: 'YouTube KOL Analysis & Creator Intelligence Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
