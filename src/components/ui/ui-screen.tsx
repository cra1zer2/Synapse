'use client'
import { ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { UiBackButton } from './ui-button'

export const IOS_PARALLAX_PERCENT = 21
const IOS_TRANSITION_MS = 340
const IOS_TRANSITION_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
export const IOS_PANEL_TRANSITION = 'transform ' + IOS_TRANSITION_MS + 'ms ' + IOS_TRANSITION_EASING
const IOS_BACKDROP_TRANSITION = 'opacity ' + IOS_TRANSITION_MS + 'ms ' + IOS_TRANSITION_EASING

function findUnderlyingPanel(currentPanel: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined' || !currentPanel) return null
  const openSubviews = Array.from(
    document.querySelectorAll<HTMLElement>('[data-ios-subview-panel="true"][data-ios-open="true"]')
  ).sort((a, b) => Number(a.dataset.iosZIndex || 50) - Number(b.dataset.iosZIndex || 50))
  const idx = openSubviews.indexOf(currentPanel)
  if (idx > 0) return openSubviews[idx - 1]
  return document.querySelector<HTMLElement>('[data-ios-root-panel="true"]')
}

function applyPanelTransform(
  panelEl: HTMLElement | null,
  transition: string,
  transform: string,
  willChange?: string,
  opacity?: string
) {
  if (!panelEl) return
  panelEl.style.transition = transition
  panelEl.style.transform = transform
  if (willChange !== undefined) panelEl.style.willChange = willChange
  if (opacity !== undefined) panelEl.style.opacity = opacity
}

interface UiScreenProps {
  isOpen?: boolean
  onClose?: () => void
  title?: string
  titleView?: ReactNode
  backLabel?: string
  isSubView?: boolean
  largeTitle?: boolean
  isReceded?: boolean
  trailing?: ReactNode
  children: ReactNode
  className?: string
  zIndex?: number
  hideHeader?: boolean
  contentClassName?: string
}

export function UiScreen({
  isOpen = true,
  onClose,
  title = '',
  titleView,
  backLabel = 'Wróć',
  isSubView = false,
  largeTitle = false,
  isReceded = false,
  trailing,
  children,
  className = '',
  zIndex,
  hideHeader = false,
  contentClassName,
}: UiScreenProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isScrolled, setIsScrolled] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const lastTouchX = useRef(0)
  const lastTouchTime = useRef(0)
  const instantVelocityX = useRef(0)
  const currentDeltaX = useRef(0)
  const isSwiping = useRef(false)
  const hasLockedHorizontal = useRef(false)
  const isClosingRef = useRef(false)
  const swipedClosedRef = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRecededRef = useRef(isReceded)
  isRecededRef.current = isReceded
  const panelRef = useRef<HTMLDivElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const underPanelRef = useRef<HTMLDivElement | HTMLElement | null>(null)
  const resolvedZIndex =
    zIndex ??
    (className.includes('z-[80]')
      ? 80
      : className.includes('z-[75]')
        ? 75
        : className.includes('z-[70]')
          ? 70
          : className.includes('z-[60]')
            ? 60
            : 50)

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
    let raf1 = 0
    let raf2 = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    if (isOpen) {
      isClosingRef.current = false
      swipedClosedRef.current = false
      isSwiping.current = false
      hasLockedHorizontal.current = false
      setIsRendered(true)
      const startEnter = () => {
        const enterTransform = isRecededRef.current
          ? 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)'
          : 'translate3d(0, 0, 0)'
        if (panelRef.current) {
          panelRef.current.style.transition = IOS_PANEL_TRANSITION
          panelRef.current.style.transform = enterTransform
          panelRef.current.style.opacity = '1'
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = IOS_BACKDROP_TRANSITION
          backdropRef.current.style.opacity = !isRecededRef.current ? '1' : '0'
        }
        setIsVisible(true)
      }
      const prepareAndEnter = () => {
        applyPanelTransform(panelRef.current, 'none', 'translate3d(100%, 0, 0)', 'transform', '1')
        if (panelRef.current) void panelRef.current.offsetWidth
        startEnter()
      }
      raf1 = requestAnimationFrame(() => {
        if (panelRef.current) prepareAndEnter()
        else raf2 = requestAnimationFrame(prepareAndEnter)
      })
    } else if (swipedClosedRef.current) {
      swipedClosedRef.current = false
      setIsVisible(false)
      setIsRendered(false)
    } else {
      if (panelRef.current) {
        panelRef.current.style.transition = IOS_PANEL_TRANSITION
        panelRef.current.style.transform = 'translate3d(100%, 0, 0)'
        panelRef.current.style.opacity = '1'
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = IOS_BACKDROP_TRANSITION
        backdropRef.current.style.opacity = '0'
      }
      setIsVisible(false)
      timer = setTimeout(() => setIsRendered(false), IOS_TRANSITION_MS)
    }
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      if (timer) clearTimeout(timer)
    }
  }, [isOpen, resolvedZIndex])

  useEffect(() => {
    if (!isOpen || !isVisible || !panelRef.current) return
    const targetTransform = isReceded ? 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)' : 'translate3d(0, 0, 0)'
    panelRef.current.style.transition = IOS_PANEL_TRANSITION
    panelRef.current.style.transform = targetTransform
    panelRef.current.style.opacity = '1'
    if (backdropRef.current) {
      backdropRef.current.style.transition = IOS_BACKDROP_TRANSITION
      backdropRef.current.style.opacity = isReceded ? '0' : '1'
    }
  }, [isReceded, isOpen, isVisible])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
    }
  }, [])

  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current || !onClose) return
    isClosingRef.current = true
    const panel = panelRef.current
    const backdrop = backdropRef.current
    const underPanel = findUnderlyingPanel(panel)
    underPanelRef.current = underPanel
    if (panel) {
      panel.style.pointerEvents = 'none'
      panel.style.transition = IOS_PANEL_TRANSITION
      panel.style.transform = 'translate3d(100%, 0, 0)'
      panel.style.opacity = '1'
    }
    if (backdrop) {
      backdrop.style.pointerEvents = 'none'
      backdrop.style.transition = IOS_BACKDROP_TRANSITION
      backdrop.style.opacity = '0'
    }
    applyPanelTransform(underPanel, IOS_PANEL_TRANSITION, 'translate3d(0, 0, 0)', 'transform', '1')
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      isClosingRef.current = false
      swipedClosedRef.current = true
      if (underPanelRef.current) {
        underPanelRef.current.style.transition = IOS_PANEL_TRANSITION
        underPanelRef.current.style.transform =
          underPanelRef.current.dataset.iosRootPanel === 'true' ? 'none' : 'translate3d(0, 0, 0)'
      }
      setIsVisible(false)
      setIsRendered(false)
      onClose()
    }, IOS_TRANSITION_MS)
  }, [onClose])

  useEffect(() => {
    if (!isOpen || !onClose || isReceded) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleRequestClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isReceded, handleRequestClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSubView || !onClose || isReceded || !isOpen || isClosingRef.current) return
    const touch = e.touches[0]
    if (touch.clientX > 48) return
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
    const now = performance.now()
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    touchStartTime.current = now
    lastTouchX.current = touch.clientX
    lastTouchTime.current = now
    instantVelocityX.current = 0
    currentDeltaX.current = 0
    isSwiping.current = true
    hasLockedHorizontal.current = false
    underPanelRef.current = findUnderlyingPanel(panelRef.current)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current || !panelRef.current) return
    const touch = e.touches[0]
    const deltaX = Math.max(0, touch.clientX - touchStartX.current)
    const deltaY = Math.abs(touch.clientY - touchStartY.current)
    if (!hasLockedHorizontal.current) {
      if (deltaY > deltaX && deltaY > 8) {
        isSwiping.current = false
        return
      }
      if (deltaX < 3) return
      hasLockedHorizontal.current = true
      panelRef.current.style.transition = 'none'
      if (backdropRef.current) backdropRef.current.style.transition = 'none'
      if (underPanelRef.current) {
        underPanelRef.current.style.transition = 'none'
        underPanelRef.current.style.willChange = 'transform'
      }
    }
    const now = performance.now()
    const dt = now - lastTouchTime.current
    if (dt > 0) {
      const v = (touch.clientX - lastTouchX.current) / dt
      instantVelocityX.current = instantVelocityX.current * 0.35 + v * 0.65
      lastTouchX.current = touch.clientX
      lastTouchTime.current = now
    }
    currentDeltaX.current = deltaX
    const width = window.innerWidth || 400
    const progress = Math.min(1, deltaX / width)
    const underOffset = -IOS_PARALLAX_PERCENT * (1 - progress)
    applyPanelTransform(panelRef.current, 'none', 'translate3d(' + deltaX + 'px, 0, 0)')
    if (backdropRef.current) backdropRef.current.style.opacity = String(1 - progress)
    applyPanelTransform(underPanelRef.current, 'none', 'translate3d(' + underOffset + '%, 0, 0)')
  }

  const handleTouchEnd = () => {
    if (!isSwiping.current || !panelRef.current) return
    isSwiping.current = false
    if (!hasLockedHorizontal.current) return
    hasLockedHorizontal.current = false
    const deltaX = currentDeltaX.current
    const elapsed = Math.max(1, performance.now() - touchStartTime.current)
    const avgVelocity = deltaX / elapsed
    const releaseVelocity = instantVelocityX.current
    const width = typeof window !== 'undefined' ? window.innerWidth : 400
    const progress = Math.min(1, deltaX / width)
    const shouldClose =
      releaseVelocity > -0.15 && (progress > 0.28 || (deltaX > 32 && (releaseVelocity > 0.35 || avgVelocity > 0.42)))
    const panel = panelRef.current
    const backdrop = backdropRef.current
    const underPanel = underPanelRef.current
    if (shouldClose && onClose) {
      isClosingRef.current = true
      const remaining = Math.max(0, 1 - progress)
      const durationMs = Math.round(230 + remaining * 100)
      const panelTransition = 'transform ' + durationMs + 'ms ' + IOS_TRANSITION_EASING
      const backdropTransition = 'opacity ' + durationMs + 'ms ' + IOS_TRANSITION_EASING
      panel.style.pointerEvents = 'none'
      applyPanelTransform(panel, panelTransition, 'translate3d(100%, 0, 0)', 'transform', '1')
      if (backdrop) {
        backdrop.style.pointerEvents = 'none'
        backdrop.style.transition = backdropTransition
        backdrop.style.opacity = '0'
      }
      applyPanelTransform(underPanel, panelTransition, 'translate3d(0, 0, 0)', 'transform', '1')
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        isClosingRef.current = false
        swipedClosedRef.current = true
        if (underPanelRef.current) {
          underPanelRef.current.style.transition = IOS_PANEL_TRANSITION
          underPanelRef.current.style.transform =
            underPanelRef.current.dataset.iosRootPanel === 'true' ? 'none' : 'translate3d(0, 0, 0)'
        }
        setIsVisible(false)
        setIsRendered(false)
        onClose()
      }, durationMs)
    } else {
      const snapDurationMs = Math.round(220 + progress * 90)
      const panelTransition = 'transform ' + snapDurationMs + 'ms ' + IOS_TRANSITION_EASING
      const backdropTransition = 'opacity ' + snapDurationMs + 'ms ' + IOS_TRANSITION_EASING
      applyPanelTransform(panel, panelTransition, 'translate3d(0, 0, 0)', 'transform', '1')
      if (backdrop) {
        backdrop.style.transition = backdropTransition
        backdrop.style.opacity = '1'
      }
      applyPanelTransform(underPanel, panelTransition, 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)', 'transform')
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      snapTimerRef.current = setTimeout(() => {
        if (panelRef.current) panelRef.current.style.transition = IOS_PANEL_TRANSITION
        if (backdropRef.current) backdropRef.current.style.transition = IOS_BACKDROP_TRANSITION
        if (underPanelRef.current) underPanelRef.current.style.transition = IOS_PANEL_TRANSITION
      }, snapDurationMs)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    if (top > 4 && !isScrolled) setIsScrolled(true)
    else if (top <= 4 && isScrolled) setIsScrolled(false)
  }

  const headerContent = (
    <div className="relative flex items-center justify-between w-full max-w-[480px] mx-auto h-[42px]">
      <div className="z-10 flex items-center min-w-[68px] h-full">
        {onClose && <UiBackButton label={backLabel} onClick={handleRequestClose} />}
      </div>
      <div
        className={
          'absolute inset-0 flex items-center justify-center text-[17px] font-semibold text-[var(--ios-label)] tracking-[-0.4px] leading-snug px-[92px] text-center transition-opacity duration-200 pointer-events-none ' +
          (largeTitle && !isScrolled ? 'opacity-0' : 'opacity-100')
        }
      >
        {titleView ? (
          <div className="pointer-events-auto">{titleView}</div>
        ) : (
          <span className="truncate max-w-full leading-snug py-0.5">{title}</span>
        )}
      </div>
      <div className="z-10 min-w-[68px] flex items-center justify-end h-full">{trailing}</div>
    </div>
  )

  const mobileStickyHeader = !hideHeader ? (
    <header
      data-ios-header-for={isSubView ? 'subview' : 'inline'}
      style={{ zIndex: 20, backgroundColor: 'var(--ios-bg)' }}
      className={
        'ios-header sticky top-0 shrink-0 transition-[border-color,background-color] duration-150 ' +
        (isScrolled ? 'border-b border-[var(--ios-separator)]' : 'border-b border-transparent')
      }
    >
      {headerContent}
    </header>
  ) : null

  if (!isSubView) {
    return (
      <div onScroll={handleScroll} className={'w-full min-h-full bg-[var(--ios-bg-primary)] overflow-y-auto flex flex-col ' + className}>
        {mobileStickyHeader}
        <div
          className={
            contentClassName ??
            'px-3.5 sm:px-4 pt-2 max-w-[480px] mx-auto w-full flex-1 shrink-0 pb-[max(calc(env(safe-area-inset-bottom,0px)+2rem),2.5rem)]'
          }
        >
          {!hideHeader && largeTitle && (
            <div className="pt-1 pb-2.5 select-none">
              <h1 className="text-[30px] sm:text-[32px] font-bold text-[var(--ios-label)] tracking-[-0.4px] leading-tight">
                {title}
              </h1>
            </div>
          )}
          {children}
        </div>
      </div>
    )
  }

  if (typeof document === 'undefined' || (!isRendered && !isOpen)) return null

  return createPortal(
    <>
      <div
        ref={backdropRef}
        onClick={handleRequestClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: resolvedZIndex - 1,
          backgroundColor: 'var(--ios-subview-backdrop)',
          opacity: isVisible && !isReceded ? 1 : 0,
          pointerEvents: isVisible && !isReceded ? 'auto' : 'none',
          transition: IOS_BACKDROP_TRANSITION,
          willChange: 'opacity',
        }}
      />
      <div
        ref={panelRef}
        data-ios-subview-panel="true"
        data-ios-open={isOpen ? 'true' : 'false'}
        data-ios-z-index={String(resolvedZIndex)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onScroll={handleScroll}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100lvh',
          minHeight: 'calc(100dvh + env(safe-area-inset-bottom, 0px))',
          zIndex: resolvedZIndex,
          backgroundColor: 'var(--ios-bg)',
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          touchAction: 'pan-y',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          transform: isVisible
            ? isReceded
              ? 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)'
              : 'translate3d(0, 0, 0)'
            : 'translate3d(100%, 0, 0)',
          opacity: 1,
          transition: IOS_PANEL_TRANSITION,
          pointerEvents: isReceded ? 'none' : 'auto',
        }}
        className={className}
      >
        {mobileStickyHeader}
        <div
          className={
            (contentClassName ??
              'px-3.5 sm:px-4 pt-2 max-w-[480px] mx-auto w-full flex-1 pb-[max(calc(env(safe-area-inset-bottom,0px)+3rem),3.5rem)]') +
            ' shrink-0' +
            (isReceded ? ' pointer-events-none' : '')
          }
        >
          {!hideHeader && largeTitle && (
            <div className="pt-1 pb-2.5 select-none">
              <h1 className="text-[30px] sm:text-[32px] font-bold text-[var(--ios-label)] tracking-[-0.4px] leading-tight">
                {title}
              </h1>
            </div>
          )}
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
