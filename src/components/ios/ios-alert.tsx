'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn.util'
import { useBodyScrollLock } from '@/hooks/scroll-lock.hook'
import { IosSpinner } from './ios-spinner'

export interface IosAlertAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'destructive' | 'destructive-solid'
  disabled?: boolean
  loading?: boolean
}

export interface IosAlertProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: React.ReactNode
  message?: React.ReactNode
  children?: React.ReactNode
  icon?: React.ReactNode
  actions: IosAlertAction[]
  stackedActions?: boolean
  disableBackdropClose?: boolean
  zIndex?: number
  className?: string
}

const ACTION_CLASSES: Record<NonNullable<IosAlertAction['variant']>, string> = {
  primary: 'bg-[var(--ios-blue)] text-white shadow-[0_2px_10px_rgba(0,136,255,0.22)]',
  secondary: 'bg-[var(--ios-element)] text-[var(--ios-label)]',
  destructive: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]',
  'destructive-solid': 'bg-[var(--ios-red)] text-white shadow-[0_2px_10px_rgba(255,56,60,0.22)]'
}

export function IosAlert({
  isOpen,
  onClose,
  title,
  subtitle,
  message,
  children,
  icon,
  actions,
  stackedActions = false,
  disableBackdropClose = false,
  zIndex = 130,
  className = ''
}: IosAlertProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableBackdropClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, disableBackdropClose, onClose])

  if (!mounted || !isOpen) return null

  const useStackedLayout = stackedActions || actions.length > 2

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center p-5 ios-modal-backdrop-animate-in"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-alert-title"
    >
      <div
        className="fixed inset-0 bg-[var(--ios-subview-backdrop)] backdrop-blur-[10px]"
        onClick={() => {
          if (!disableBackdropClose) onClose()
        }}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-[300px] ios-glass-modal rounded-[34px] p-[14px] pt-5 flex flex-col items-center text-center gap-3 ios-modal-animate-in',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {icon && (
          <div className="shrink-0 flex items-center justify-center">
            {icon}
          </div>
        )}

        <div className="px-2 flex flex-col items-center gap-1 min-w-0 w-full">
          <h3
            id="ios-alert-title"
            className="text-[17px] font-bold tracking-[-0.02em] text-[var(--ios-label)] leading-snug"
          >
            {title}
          </h3>
          {subtitle && (
            <div className="text-[14px] font-medium text-[var(--ios-label)] opacity-85 truncate max-w-full">
              {subtitle}
            </div>
          )}
          {message && (
            <div className="text-[13px] font-normal text-[var(--ios-secondary)] leading-relaxed break-words max-w-full mt-0.5">
              {message}
            </div>
          )}
        </div>

        {children && <div className="w-full px-1">{children}</div>}

        <div
          className={cn(
            'w-full pt-1',
            useStackedLayout
              ? 'flex flex-col gap-2'
              : actions.length === 1
                ? 'flex'
                : 'grid grid-cols-2 gap-2.5'
          )}
        >
          {actions.map((action, idx) => {
            const variant = action.variant || 'secondary'
            return (
              <button
                key={`${action.label}-${idx}`}
                type="button"
                disabled={action.disabled || action.loading}
                onClick={action.onClick}
                className={cn(
                  'h-[48px] w-full px-4 rounded-full text-[15px] font-semibold inline-flex items-center justify-center gap-1.5 transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96] disabled:opacity-45 cursor-pointer disabled:cursor-default truncate',
                  ACTION_CLASSES[variant]
                )}
              >
                {action.loading && (
                  <IosSpinner
                    size="small"
                    className={
                      variant === 'primary' || variant === 'destructive-solid'
                        ? 'text-white'
                        : 'text-[var(--ios-blue)]'
                    }
                  />
                )}
                <span className="truncate">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
