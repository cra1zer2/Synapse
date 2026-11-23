'use client'

import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/utils/cn.util'
import { UiSpinner } from '@/components/ui/ui-spinner'

/* === Group Boxes & Form Rows (macOS 27: 12px radius, 1px row dividers) === */

interface MacGroupBoxProps {
  title?: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  noPadding?: boolean
}

export function MacGroupBox({
  title,
  subtitle,
  trailing,
  children,
  className = '',
  contentClassName = '',
  noPadding = false
}: MacGroupBoxProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      {(title || trailing || subtitle) && (
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] leading-[14px]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-[var(--mac-label-2)] mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
          {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
      )}
      <div className={cn('mac-group-box overflow-hidden', !noPadding && 'p-3.5', contentClassName)}>
        {children}
      </div>
    </div>
  )
}

interface MacFormRowProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
  isLast?: boolean
  tall?: boolean
}

export function MacFormRow({
  title,
  subtitle,
  icon,
  trailing,
  onClick,
  className = '',
  isLast = false,
  tall = false
}: MacFormRowProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full px-3.5 flex items-center justify-between gap-3 text-left transition-colors duration-100',
        tall || subtitle ? 'min-h-[48px] py-2' : 'min-h-[42px] py-1.5',
        !isLast && 'border-b border-[var(--mac-row-divider)]',
        onClick && 'cursor-pointer hover:bg-[var(--mac-fill-4)] active:bg-[var(--mac-fill-3)]',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-[var(--mac-label-1)] leading-[16px] truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-[var(--mac-label-2)] leading-[14px] mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </Tag>
  )
}

/* === Push Buttons (macOS 27 Capsule Buttons: Sm 22px, Rg 26px, Lg 30px, XL 36px) === */

type MacButtonVariant = 'prominent' | 'tinted' | 'bordered' | 'over-glass' | 'destructive' | 'ghost'
type MacButtonSize = 'sm' | 'rg' | 'lg' | 'xl'

interface MacPushButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MacButtonVariant
  size?: MacButtonSize
  loading?: boolean
  icon?: ReactNode
}

const MAC_BTN_VARIANTS: Record<MacButtonVariant, string> = {
  prominent:
    'bg-[var(--mac-blue)] text-white shadow-[0_1px_2px_rgba(0,136,255,0.28),inset_0_0.5px_0_rgba(255,255,255,0.35)] hover:brightness-105 active:brightness-95',
  tinted:
    'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] hover:bg-[rgba(0,136,255,0.18)] active:bg-[rgba(0,136,255,0.24)]',
  bordered:
    'bg-[var(--mac-fill-2)] text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-1)] active:bg-[var(--mac-fill-1)]',
  'over-glass':
    'mac-glass-pill text-[var(--mac-label-1)] hover:brightness-[0.98] dark:hover:brightness-110 active:scale-[0.97]',
  destructive:
    'bg-[var(--ios-red-subtle)] text-[var(--mac-red)] hover:bg-[rgba(255,56,60,0.20)]',
  ghost:
    'bg-transparent text-[var(--mac-label-2)] hover:text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-3)]'
}

const MAC_BTN_SIZES: Record<MacButtonSize, string> = {
  sm: 'h-[22px] px-2.5 text-[11px] font-medium gap-1',
  rg: 'h-[26px] px-3 text-[12px] font-medium gap-1.5',
  lg: 'h-[30px] px-3.5 text-[13px] font-medium gap-1.5',
  xl: 'h-[36px] px-4 text-[13px] font-semibold gap-2'
}

export function MacPushButton({
  variant = 'bordered',
  size = 'rg',
  loading = false,
  icon,
  children,
  disabled,
  type = 'button',
  className = '',
  ...rest
}: MacPushButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'rounded-full inline-flex items-center justify-center shrink-0 select-none cursor-pointer transition-all duration-100 mac-focus-ring outline-none',
        'disabled:opacity-45 disabled:cursor-default',
        MAC_BTN_VARIANTS[variant],
        MAC_BTN_SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <UiSpinner
          size="small"
          className={variant === 'prominent' ? 'text-white' : 'text-[var(--mac-blue)]'}
        />
      ) : (
        icon
      )}
      {children !== undefined && children !== null && <span className="truncate">{children}</span>}
    </button>
  )
}

/* === Liquid Glass Toolbar Controls (macOS 27 Titlebars & Toolbars: 36px XL capsule) === */

interface MacToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label?: string
  active?: boolean
  badgeDot?: boolean
  badgeCount?: number
}

export function MacToolbarButton({
  icon,
  label,
  active = false,
  badgeDot = false,
  badgeCount,
  type = 'button',
  className = '',
  ...rest
}: MacToolbarButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'relative h-[36px] rounded-full inline-flex items-center justify-center gap-1.5 select-none cursor-pointer transition-all duration-150 mac-focus-ring outline-none',
        label ? 'px-3.5 text-[13px] font-medium' : 'w-[36px]',
        active
          ? 'bg-[var(--mac-blue)] text-white shadow-[0_2px_10px_rgba(0,136,255,0.28)]'
          : 'mac-glass-pill text-[var(--mac-label-1)] hover:brightness-[0.98] dark:hover:brightness-110 active:scale-[0.96]',
        'disabled:opacity-45 disabled:cursor-default',
        className
      )}
      {...rest}
    >
      {icon}
      {label && <span className="truncate">{label}</span>}
      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--mac-red)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : badgeDot ? (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--mac-red)]" />
      ) : null}
    </button>
  )
}

export function MacToolbarCapsuleGroup({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'h-[36px] rounded-full mac-glass-pill inline-flex items-center px-1 gap-0.5 select-none',
        className
      )}
    >
      {children}
    </div>
  )
}

/* === macOS 27 Segmented Controls (Toolbar 36px vs Content Area 26px/28px) === */

export interface MacSegmentOption<T extends string | number> {
  id: T
  label: string
  badge?: number
}

export function MacSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  surface = 'content',
  className = ''
}: {
  options: MacSegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  surface?: 'toolbar' | 'content'
  className?: string
}) {
  if (surface === 'toolbar') {
    return (
      <div
        className={cn(
          'h-[36px] rounded-full mac-glass-pill p-[4px] inline-flex items-center gap-0.5 select-none',
          className
        )}
      >
        {options.map((opt) => {
          const isActive = opt.id === value
          return (
            <button
              key={String(opt.id)}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'h-[28px] px-3 rounded-full text-[12px] leading-[15px] inline-flex items-center justify-center gap-1.5 min-w-0 cursor-pointer transition-all duration-150 select-none outline-none',
                isActive
                  ? 'bg-[var(--mac-blue-overglass)] text-white font-semibold shadow-[0_1px_4px_rgba(0,120,240,0.32)]'
                  : 'text-[var(--mac-label-1)]/80 font-medium hover:text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-3)]'
              )}
            >
              <span className="truncate">{opt.label}</span>
              {typeof opt.badge === 'number' && opt.badge > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'
                  )}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-[28px] rounded-full bg-[var(--mac-fill-2)] p-[2px] inline-flex items-center gap-0.5 select-none',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.id === value
        return (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'h-[24px] px-3 rounded-full text-[12px] leading-[15px] inline-flex items-center justify-center gap-1.5 min-w-0 cursor-pointer transition-all duration-150 select-none outline-none flex-1',
              isActive
                ? 'bg-[var(--mac-blue)] text-white font-semibold shadow-[0_1px_3px_rgba(0,136,255,0.3)]'
                : 'text-[var(--mac-label-2)] font-medium hover:text-[var(--mac-label-1)]'
            )}
          >
            <span className="truncate">{opt.label}</span>
            {typeof opt.badge === 'number' && opt.badge > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums leading-none',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* === macOS 27 Pop-up Button (28px capsule select) === */

interface MacPopupSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string
  surface?: 'content' | 'toolbar'
  icon?: ReactNode
  active?: boolean
}

export function MacPopupSelect({
  wrapperClassName = '',
  className = '',
  surface = 'content',
  icon,
  active = false,
  children,
  ...rest
}: MacPopupSelectProps) {
  const isToolbar = surface === 'toolbar'
  return (
    <div
      className={cn(
        'relative inline-flex items-center',
        isToolbar ? 'w-auto shrink-0' : 'w-full',
        wrapperClassName
      )}
    >
      {icon && (
        <span
          className={cn(
            'pointer-events-none absolute flex items-center justify-center shrink-0',
            isToolbar ? 'left-3' : 'left-2.5',
            active ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-blue)]/90'
          )}
        >
          {icon}
        </span>
      )}
      <select
        className={cn(
          'rounded-full appearance-none outline-none mac-focus-ring cursor-pointer transition-all duration-150',
          isToolbar
            ? cn(
                'w-auto h-[36px] mac-glass-pill hover:brightness-[0.98] dark:hover:brightness-110 pr-8 text-[13px] font-medium',
                icon ? 'pl-8' : 'pl-3.5',
                active
                  ? '!bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] ring-1 ring-[var(--mac-blue)]/45 font-semibold'
                  : 'text-[var(--mac-label-1)] ring-1 ring-[var(--mac-label-1)]/12'
              )
            : cn(
                'w-full h-[28px] bg-[var(--mac-fill-2)] hover:bg-[var(--mac-fill-1)] pr-7 text-[12px] font-medium text-[var(--mac-label-1)]',
                icon ? 'pl-7' : 'pl-3'
              ),
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronsUpDown
        className={cn(
          'w-3.5 h-3.5 pointer-events-none absolute shrink-0',
          active ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-label-2)]',
          isToolbar ? 'right-3' : 'right-2.5'
        )}
        strokeWidth={2}
      />
    </div>
  )
}

/* === macOS 27 Search Field (36px toolbar capsule or 28px content capsule) === */

export function MacSearchField({
  value,
  onChange,
  placeholder = 'Search...',
  surface = 'content',
  className = ''
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  surface?: 'toolbar' | 'content'
  className?: string
}) {
  const isToolbar = surface === 'toolbar'
  return (
    <div
      className={cn(
        'rounded-full flex items-center gap-2 px-3 mac-input-focus transition-shadow duration-150 select-none',
        isToolbar
          ? 'h-[36px] mac-glass-pill'
          : 'h-[30px] bg-[var(--mac-fill-3)] border border-[var(--mac-group-border)]',
        className
      )}
    >
      <Search className="w-3.5 h-3.5 text-[var(--mac-label-2)] shrink-0" strokeWidth={2.1} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] text-[var(--mac-label-1)] placeholder-[var(--mac-label-2)] outline-none leading-none"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear"
          className="w-4 h-4 rounded-full bg-[var(--mac-label-3)] text-[var(--mac-window-bg)] flex items-center justify-center shrink-0 hover:bg-[var(--mac-label-2)] cursor-pointer"
        >
          <X className="w-2.5 h-2.5" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

/* === macOS 27 Switch (44x20 track, 26x16 oblong capsule knob) === */

export function MacSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex items-center w-[44px] h-[20px] rounded-full p-[2px] transition-colors duration-150 shrink-0 outline-none mac-focus-ring',
        disabled ? 'opacity-45 cursor-default' : 'cursor-pointer',
        checked ? 'bg-[var(--mac-blue)]' : 'bg-[var(--mac-fill-1)]'
      )}
    >
      <span
        className={cn(
          'w-[26px] h-[16px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.20),inset_0_0.5px_0_rgba(255,255,255,0.9)] transition-transform duration-150',
          checked ? 'translate-x-[14px]' : 'translate-x-0'
        )}
      />
    </button>
  )
}

/* === macOS 27 Dialog / Sheet Window (26px corner radius, #ffffff / #1e1e1e) === */

interface MacDialogWindowProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  headerActions?: ReactNode
  children: ReactNode
  widthClass?: string
  heightClass?: string
  noPadding?: boolean
}

export function MacDialogWindow({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  children,
  widthClass = 'max-w-[780px]',
  heightClass = 'max-h-[84vh]',
  noPadding = false
}: MacDialogWindowProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      className="mac-desktop-root fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[4px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className={cn(
          'mac-dialog-window mac-dialog-animate-in w-full flex flex-col overflow-hidden text-[var(--mac-label-1)]',
          widthClass,
          heightClass
        )}
      >
        {(title || headerActions) && (
          <div className="h-[52px] px-5 shrink-0 flex items-center justify-between gap-3 border-b border-[var(--mac-row-divider)] select-none">
            <div className="min-w-0">
              {title && (
                <h2 className="text-[15px] font-semibold text-[var(--mac-label-1)] leading-[20px] truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[11px] text-[var(--mac-label-2)] leading-[14px] truncate">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-7 h-7 rounded-full bg-[var(--mac-fill-3)] hover:bg-[var(--mac-fill-2)] flex items-center justify-center text-[var(--mac-label-2)] hover:text-[var(--mac-label-1)] cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}
        <div className={cn('flex-1 min-h-0 overflow-y-auto', !noPadding && 'p-5')}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* === Custom macOS Date Picker (Popover Calendar) === */

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplayDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

export function MacDatePicker({
  value,
  onChange,
  lang = 'pl',
  className = '',
  buttonClassName = '',
  align = 'left'
}: {
  value: string
  onChange: (iso: string) => void
  lang?: string
  className?: string
  buttonClassName?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const todayIso = useMemo(() => toIsoDateLocal(new Date()), [])

  const [cursorMonth, setCursorMonth] = useState(() => {
    const parsed = value ? new Date(`${value}T12:00:00`) : new Date()
    const valid = !isNaN(parsed.getTime()) ? parsed : new Date()
    return new Date(valid.getFullYear(), valid.getMonth(), 1)
  })

  useEffect(() => {
    if (!open || !value) return
    const parsed = new Date(`${value}T12:00:00`)
    if (!isNaN(parsed.getTime())) {
      setCursorMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const isPl = lang === 'pl'
  const weekdays = isPl
    ? ['Po', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Ni']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  const monthLabel = useMemo(() => {
    return cursorMonth.toLocaleDateString(isPl ? 'pl-PL' : 'en-US', {
      month: 'long',
      year: 'numeric'
    })
  }, [cursorMonth, isPl])

  const cells = useMemo(() => {
    const year = cursorMonth.getFullYear()
    const month = cursorMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const offset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const list: Array<{ iso: string | null; dayNum?: number }> = []
    for (let i = 0; i < offset; i++) list.push({ iso: null })
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({
        iso: toIsoDateLocal(new Date(year, month, d)),
        dayNum: d
      })
    }
    return list
  }, [cursorMonth])

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'h-[32px] w-full px-3 rounded-[8px] bg-[var(--mac-fill-4)] hover:bg-[var(--mac-fill-3)] border border-[var(--mac-group-border)] flex items-center justify-between gap-2 text-[12px] font-medium text-[var(--mac-label-1)] tabular-nums transition-colors cursor-pointer outline-none mac-focus-ring',
          open && 'border-[var(--mac-blue)] ring-2 ring-[var(--ios-blue-subtle)]',
          buttonClassName
        )}
      >
        <span>{value ? formatDisplayDate(value) : '—'}</span>
        <Calendar className="w-3.5 h-3.5 text-[var(--mac-label-2)] shrink-0" strokeWidth={1.9} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+6px)] z-50 w-[256px] mac-popover p-3 select-none',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <button
              type="button"
              onClick={() =>
                setCursorMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
              className="w-6 h-6 rounded-[6px] hover:bg-[var(--mac-fill-3)] flex items-center justify-center text-[var(--mac-label-2)] hover:text-[var(--mac-label-1)] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[12px] font-semibold text-[var(--mac-label-1)] capitalize">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() =>
                setCursorMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
              className="w-6 h-6 rounded-[6px] hover:bg-[var(--mac-fill-3)] flex items-center justify-center text-[var(--mac-label-2)] hover:text-[var(--mac-label-1)] cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {weekdays.map((wd) => (
              <div
                key={wd}
                className="text-[10px] font-semibold text-[var(--mac-label-3)] py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, idx) => {
              if (!cell.iso) {
                return <div key={`empty-${idx}`} className="h-7" />
              }
              const isSelected = cell.iso === value
              const isToday = cell.iso === todayIso
              const isWeekend = idx % 7 === 5 || idx % 7 === 6
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso!)
                    setOpen(false)
                  }}
                  className={cn(
                    'h-7 rounded-full text-[11px] font-medium flex items-center justify-center tabular-nums cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[var(--mac-blue)] text-white font-bold shadow-[0_1px_4px_rgba(0,136,255,0.35)]'
                      : isWeekend
                        ? 'text-[var(--mac-label-2)] hover:bg-[var(--mac-fill-3)]'
                        : 'text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-3)]',
                    isToday && !isSelected && 'ring-1 ring-[var(--mac-blue)] text-[var(--mac-blue)] font-semibold'
                  )}
                >
                  {cell.dayNum}
                </button>
              )
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--mac-row-divider)] flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(todayIso)
                setOpen(false)
              }}
              className="text-[11px] font-semibold text-[var(--mac-blue)] hover:underline cursor-pointer px-1"
            >
              {isPl ? 'Dzisiaj' : 'Today'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
