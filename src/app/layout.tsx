import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Synapse',
  description: 'Synapse Librus Client',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-gray-100 text-gray-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}