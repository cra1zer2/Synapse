'use client'

export interface IosSpinnerProps {
  size?: 'small' | 'regular' | 'large'
  className?: string
}

export function IosSpinner({
  size = 'regular',
  className = 'text-[var(--ios-secondary)]'
}: IosSpinnerProps) {
  const pixelSize = {
    small: 14,
    regular: 20,
    large: 35
  }[size]

  const sizeClass = {
    small: 'w-[14px] h-[14px]',
    regular: 'w-[20px] h-[20px]',
    large: 'w-[35px] h-[35px]'
  }[size]

  const svgClass = 'ios-spinner ' + sizeClass + ' ' + className

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      className={svgClass}
      viewBox="0 0 24 24"
      fill="none"
    >
      <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="1" />
      <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.875" />
      <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.625" />
      <line x1="12" y1="22" x2="12" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.375" />
      <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.125" />
    </svg>
  )
}
