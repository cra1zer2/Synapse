'use client'

import { cn } from '@/utils/cn.util'

export interface IosSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function IosSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel = 'Switch',
  className = ''
}: IosSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-[28px] w-[64px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.96]',
        checked ? 'bg-[var(--ios-green)]' : 'bg-[var(--ios-switch-off)]',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[24px] w-[38px] rounded-[13px] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.16),0_0.5px_1px_rgba(0,0,0,0.14)] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        )}
      />
    </button>
  )
}
