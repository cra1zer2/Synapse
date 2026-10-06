import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Synapse',
  description: 'Smart Librus Synergia Client',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Synapse'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--ios-bg)] text-[var(--ios-label)]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}