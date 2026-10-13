'use client'

interface IosSwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    ariaLabel?: string
}

export function IosSwitch({
    checked,
    onChange,
    disabled = false,
    ariaLabel = 'Switch'
}: IosSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-250 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-[var(--ios-green)]' : 'bg-[var(--ios-switch-off)]'
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition duration-250 ease-in-out ${checked ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
            />
        </button>
    )
}