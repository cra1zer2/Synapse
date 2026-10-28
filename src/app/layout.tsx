import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Synapse',
  description: 'Smart Librus Synergia Client',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Synapse'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="min-h-[100dvh] flex flex-col bg-[var(--ios-bg)] text-[var(--ios-label)] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
