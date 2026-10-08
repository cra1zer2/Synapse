import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        apple: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"SF Pro"',
          'system-ui',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ]
      },
      colors: {
        ios: {
          bg: 'var(--ios-bg)',
          'bg-secondary': 'var(--ios-bg-secondary)',
          card: 'var(--ios-card)',
          'card-solid': 'var(--ios-card-solid)',
          'card-secondary': 'var(--ios-card-secondary)',
          element: 'var(--ios-element)',
          input: 'var(--ios-input)',
          separator: 'var(--ios-separator)',
          border: 'var(--ios-border)',
          label: 'var(--ios-label)',
          secondary: 'var(--ios-secondary)',
          tertiary: 'var(--ios-tertiary)',
          quaternary: 'var(--ios-quaternary)',
          blue: 'var(--ios-blue)',
          'blue-subtle': 'var(--ios-blue-subtle)',
          green: 'var(--ios-green)',
          'green-subtle': 'var(--ios-green-subtle)',
          orange: 'var(--ios-orange)',
          'orange-subtle': 'var(--ios-orange-subtle)',
          red: 'var(--ios-red)',
          'red-subtle': 'var(--ios-red-subtle)',
          purple: 'var(--ios-purple)',
          'purple-subtle': 'var(--ios-purple-subtle)',
          teal: 'var(--ios-teal)',
          yellow: 'var(--ios-yellow)',
          'room-bg': 'var(--ios-room-bg)',
          'room-text': 'var(--ios-room-text)',
          'switch-off': 'var(--ios-switch-off)'
        }
      },
      borderRadius: {
        'ios-sheet': '28px',
        'ios-card': '20px',
        'ios-inner': '14px',
        'ios-input': '12px',
        'ios-button': '12px',
        'ios-badge': '8px'
      },
      boxShadow: {
        'ios-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'ios-card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'ios-modal': '0 10px 40px rgba(0, 0, 0, 0.15)',
        'ios-sheet': '0 -8px 30px rgba(0, 0, 0, 0.12)'
      }
    }
  },
  plugins: []
}

export default config
