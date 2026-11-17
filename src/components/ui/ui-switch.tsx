'use client'
import { cn } from '@/utils/cn.util'

interface UiSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function UiSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel = 'Switch',
  className = '',
}: UiSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full p-[2px] shadow-[var(--ios-switch-track-shadow)] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.96]',
        checked ? 'bg-[var(--ios-green)]' : 'bg-[var(--ios-switch-off)]',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-[var(--ios-switch-thumb-shadow)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
          checked ? 'translate-x-[20px]' : 'translate-x-0 opacity-90'
        )}
      />
    </button>
  )
}
