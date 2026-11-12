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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var theme = localStorage.getItem('synapse_theme') || 'system';
                var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                var root = document.documentElement;
                if (isDark) {
                  root.classList.add('dark');
                  root.classList.remove('light');
                } else {
                  root.classList.add('light');
                  root.classList.remove('dark');
                }
                var ua = navigator.userAgent || '';
                if (/iPhone|iPod/i.test(ua)) {
                  root.classList.add('is-iphone');
                }
                var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
                if (isStandalone) {
                  root.classList.add('is-standalone');
                }
              } catch(e) {}
            })()`
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--ios-bg)] text-[var(--ios-label)] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
