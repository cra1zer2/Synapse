'use client'

import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/utils/cn.util'
import { IosSpinner } from './ios-spinner'

export type IosButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'destructive-solid'
  | 'glass'
  | 'ghost'

export type IosButtonSize = 'sm' | 'md' | 'lg'

export interface IosButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IosButtonVariant
  size?: IosButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
}

const BUTTON_VARIANTS: Record<IosButtonVariant, string> = {
  primary: 'bg-[var(--ios-blue)] text-white shadow-[0_2px_10px_rgba(0,136,255,0.22)] hover:brightness-105',
  secondary: 'bg-[var(--ios-element)] text-[var(--ios-label)] hover:bg-[var(--ios-row-hover)]',
  destructive: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]',
  'destructive-solid': 'bg-[var(--ios-red)] text-white shadow-[0_2px_10px_rgba(255,56,60,0.22)]',
  glass: 'ios-glass-control text-[var(--ios-label)]',
  ghost: 'bg-transparent text-[var(--ios-blue)] hover:bg-[var(--ios-blue-subtle)]'
}

const BUTTON_SIZES: Record<IosButtonSize, string> = {
  sm: 'h-[32px] px-3 text-[13px] font-semibold gap-1.5',
  md: 'h-[40px] px-4 text-[14px] font-semibold gap-2',
  lg: 'h-[50px] px-5 text-[16px] font-semibold gap-2'
}

export function IosButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  disabled,
  type = 'button',
  className = '',
  ...rest
}: IosButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'rounded-full inline-flex items-center justify-center shrink-0 select-none transition-all duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100 cursor-pointer disabled:cursor-default',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <IosSpinner
          size="small"
          className={variant === 'primary' || variant === 'destructive-solid' ? 'text-white' : 'text-[var(--ios-blue)]'}
        />
      ) : (
        icon
      )}
      <span className="truncate">{children}</span>
    </button>
  )
}

export interface IosIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'glass' | 'subtle' | 'solid'
  badgeCount?: number
  badgeDot?: boolean
}

const ICON_BTN_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-9 h-9',
  md: 'w-10 h-10',
  lg: 'w-11 h-11'
}

const ICON_BTN_VARIANTS: Record<'glass' | 'subtle' | 'solid', string> = {
  glass: 'ios-glass-control text-[var(--ios-label)]',
  subtle: 'bg-[var(--ios-element)] text-[var(--ios-label)]',
  solid: 'bg-[var(--ios-blue)] text-white shadow-[0_2px_10px_rgba(0,136,255,0.22)]'
}

export function IosIconButton({
  icon,
  size = 'md',
  variant = 'glass',
  badgeCount,
  badgeDot = false,
  type = 'button',
  className = '',
  ...rest
}: IosIconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'relative rounded-full inline-flex items-center justify-center shrink-0 select-none transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.92] disabled:opacity-45 cursor-pointer disabled:cursor-default',
        ICON_BTN_SIZES[size],
        ICON_BTN_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {icon}
      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--ios-red)] text-white text-[10px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--ios-bg)]">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : badgeDot ? (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--ios-red)] border border-[var(--ios-bg)]" />
      ) : null}
    </button>
  )
}

export interface IosBackButtonProps {
  label?: string
  onClick: () => void
  className?: string
  ariaLabel?: string
}

export function IosBackButton({
  label,
  onClick,
  className = '',
  ariaLabel
}: IosBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label || 'Back'}
      className={cn(
        'h-full -ml-1.5 pr-2 inline-flex items-center gap-0.5 text-[var(--ios-blue)] shrink-0 select-none transition-opacity duration-150 hover:opacity-75 active:opacity-45 cursor-pointer',
        label && 'max-w-[136px]',
        className
      )}
    >
      <ChevronLeft className="w-[22px] h-[22px] stroke-[2.3] shrink-0" />
      {label && (
        <span className="text-[17px] font-normal truncate leading-snug py-0.5">
          {label}
        </span>
      )}
    </button>
  )
}
