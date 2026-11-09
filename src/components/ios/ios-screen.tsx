'use client'

import { ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export const IOS_PARALLAX_PERCENT = 21
export const IOS_TRANSITION_MS = 380
export const IOS_TRANSITION_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
export const IOS_PANEL_TRANSITION = `transform ${IOS_TRANSITION_MS}ms ${IOS_TRANSITION_EASING}`
export const IOS_BACKDROP_TRANSITION = `opacity ${IOS_TRANSITION_MS}ms ${IOS_TRANSITION_EASING}`

function findUnderlyingPanel(currentPanel: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined' || !currentPanel) return null
  const openSubviews = Array.from(
    document.querySelectorAll<HTMLElement>('[data-ios-subview-panel="true"][data-ios-open="true"]')
  ).sort((a, b) => Number(a.dataset.iosZIndex || 50) - Number(b.dataset.iosZIndex || 50))

  const idx = openSubviews.indexOf(currentPanel)
  if (idx > 0) {
    return openSubviews[idx - 1]
  }
  return document.querySelector<HTMLElement>('[data-ios-root-panel="true"]')
}

export interface IosScreenProps {
  isOpen?: boolean
  onClose?: () => void
  title?: string
  titleView?: ReactNode
  backLabel?: string
  showBackButton?: boolean
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

export function IosScreen({
  isOpen = true,
  onClose,
  title = '',
  titleView,
  backLabel = 'Wróć',
  showBackButton = false,
  isSubView = false,
  largeTitle = false,
  isReceded = false,
  trailing,
  children,
  className = '',
  zIndex,
  hideHeader = false,
  contentClassName
}: IosScreenProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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

  const panelRef = useRef<HTMLDivElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const underPanelRef = useRef<HTMLDivElement | HTMLElement | null>(null)

  const resolvedZIndex = zIndex ?? (
    className.includes('z-[80]') ? 80 :
    className.includes('z-[75]') ? 75 :
    className.includes('z-[70]') ? 70 :
    className.includes('z-[60]') ? 60 : 50
  )

  useEffect(() => {
    let raf1 = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    if (isOpen) {
      isClosingRef.current = false
      swipedClosedRef.current = false
      setIsRendered(true)
      raf1 = requestAnimationFrame(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = isDesktop
            ? (isStackedOnDesktop ? 'opacity 0.16s ease' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease')
            : IOS_PANEL_TRANSITION
          void panelRef.current.offsetWidth
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = isDesktop ? 'opacity 0.2s ease' : IOS_BACKDROP_TRANSITION
        }
        setIsVisible(true)
      })
    } else if (swipedClosedRef.current) {
      swipedClosedRef.current = false
      setIsVisible(false)
      setIsRendered(false)
    } else {
      if (panelRef.current) {
        panelRef.current.style.transition = isDesktop
          ? (isStackedOnDesktop ? 'opacity 0.14s ease' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.16s ease')
          : IOS_PANEL_TRANSITION
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = isDesktop ? 'opacity 0.18s ease' : IOS_BACKDROP_TRANSITION
      }
      setIsVisible(false)
      timer = setTimeout(() => {
        setIsRendered(false)
      }, isDesktop ? (isStackedOnDesktop ? 150 : 200) : IOS_TRANSITION_MS)
    }

    return () => {
      cancelAnimationFrame(raf1)
      if (timer) clearTimeout(timer)
    }
  }, [isOpen, isDesktop])

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
    const underPanel = isDesktop ? null : findUnderlyingPanel(panel)
    underPanelRef.current = underPanel

    if (panel) {
      panel.style.pointerEvents = 'none'
      if (isDesktop) {
        if (resolvedZIndex > 50) {
          panel.style.transition = 'opacity 0.14s ease'
          panel.style.opacity = '0'
        } else {
          panel.style.transition = 'transform 0.18s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease'
          panel.style.transform = 'scale(0.96)'
          panel.style.opacity = '0'
        }
      } else {
        panel.style.transition = IOS_PANEL_TRANSITION
        panel.style.transform = 'translate3d(100%, 0, 0)'
      }
    }
    if (backdrop) {
      backdrop.style.pointerEvents = 'none'
      backdrop.style.transition = isDesktop ? 'opacity 0.18s ease' : IOS_BACKDROP_TRANSITION
      backdrop.style.opacity = '0'
    }
    if (underPanel) {
      underPanel.style.transition = IOS_PANEL_TRANSITION
      underPanel.style.transform = 'translate3d(0, 0, 0)'
    }

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      isClosingRef.current = false
      swipedClosedRef.current = true
      if (underPanelRef.current) {
        underPanelRef.current.style.transition = IOS_PANEL_TRANSITION
      }
      setIsVisible(false)
      setIsRendered(false)
      onClose()
    }, isDesktop ? 200 : IOS_TRANSITION_MS)
  }, [onClose, isDesktop])

  useEffect(() => {
    if (!isOpen || !onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleRequestClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDesktop || !isSubView || !onClose || isReceded || !isOpen || isClosingRef.current) return
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
      if (deltaX < 2) return
      hasLockedHorizontal.current = true
      panelRef.current.style.transition = 'none'
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'none'
      }
      if (underPanelRef.current) {
        underPanelRef.current.style.transition = 'none'
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

    panelRef.current.style.transform = `translate3d(${deltaX}px, 0, 0)`

    if (backdropRef.current) {
      backdropRef.current.style.opacity = String(1 - progress)
    }

    if (underPanelRef.current) {
      underPanelRef.current.style.transform = `translate3d(${underOffset}%, 0, 0)`
    }
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
      releaseVelocity > -0.15 &&
      (progress > 0.28 || (deltaX > 32 && (releaseVelocity > 0.35 || avgVelocity > 0.42)))

    const panel = panelRef.current
    const backdrop = backdropRef.current
    const underPanel = underPanelRef.current

    if (shouldClose && onClose) {
      isClosingRef.current = true
      const remaining = Math.max(0, 1 - progress)
      const durationMs = Math.round(260 + remaining * 120)
      const panelTransition = `transform ${durationMs}ms ${IOS_TRANSITION_EASING}`
      const backdropTransition = `opacity ${durationMs}ms ${IOS_TRANSITION_EASING}`

      panel.style.pointerEvents = 'none'
      panel.style.transition = panelTransition
      panel.style.transform = 'translate3d(100%, 0, 0)'

      if (backdrop) {
        backdrop.style.pointerEvents = 'none'
        backdrop.style.transition = backdropTransition
        backdrop.style.opacity = '0'
      }

      if (underPanel) {
        underPanel.style.transition = panelTransition
        underPanel.style.transform = 'translate3d(0, 0, 0)'
      }

      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        isClosingRef.current = false
        swipedClosedRef.current = true
        if (underPanelRef.current) {
          underPanelRef.current.style.transition = IOS_PANEL_TRANSITION
        }
        setIsVisible(false)
        setIsRendered(false)
        onClose()
      }, durationMs)
    } else {
      const snapDurationMs = Math.round(250 + progress * 110)
      const panelTransition = `transform ${snapDurationMs}ms ${IOS_TRANSITION_EASING}`
      const backdropTransition = `opacity ${snapDurationMs}ms ${IOS_TRANSITION_EASING}`

      panel.style.transition = panelTransition
      panel.style.transform = 'translate3d(0, 0, 0)'

      if (backdrop) {
        backdrop.style.transition = backdropTransition
        backdrop.style.opacity = '1'
      }

      if (underPanel) {
        underPanel.style.transition = panelTransition
        underPanel.style.transform = `translate3d(-${IOS_PARALLAX_PERCENT}%, 0, 0)`
      }

      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      snapTimerRef.current = setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = IOS_PANEL_TRANSITION
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = IOS_BACKDROP_TRANSITION
        }
        if (underPanelRef.current) {
          underPanelRef.current.style.transition = IOS_PANEL_TRANSITION
        }
      }, snapDurationMs)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    if (top > 4 && !isScrolled) {
      setIsScrolled(true)
    } else if (top <= 4 && isScrolled) {
      setIsScrolled(false)
    }
  }

  const headerContent = (
    <div className="relative flex items-center justify-between w-full max-w-[402px] mx-auto h-[44px]">
      <div className="z-10 flex items-center min-w-[70px] h-full">
        {onClose && (
          <button
            type="button"
            onClick={handleRequestClose}
            className="flex items-center gap-1 text-[var(--ios-blue)] text-[17px] font-normal leading-none active:opacity-55 active:scale-[0.97] transition-[opacity,transform] duration-150 -ml-1 h-full pr-2 select-none cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="max-w-[85px] truncate">{backLabel}</span>
          </button>
        )}
      </div>

      <div className={"absolute inset-0 flex items-center justify-center text-[17px] font-semibold text-[var(--ios-label)] tracking-[-0.4px] leading-none px-[74px] text-center transition-opacity duration-200 pointer-events-none " + (largeTitle && !isScrolled ? "opacity-0" : "opacity-100")}>
        {titleView ? <div className="pointer-events-auto">{titleView}</div> : <span className="truncate max-w-full">{title}</span>}
      </div>

      <div className="z-10 min-w-[70px] flex items-center justify-start h-full">
        {trailing}
      </div>
    </div>
  )

  const isStackedOnDesktop = isDesktop && resolvedZIndex > 50

  const desktopHeader = (
    <header className={"relative sticky top-0 z-30 w-full bg-[var(--ios-modal-bg)] px-5 h-[52px] flex items-center justify-between shrink-0 transition-[border-color] duration-150 " + (isScrolled ? "border-b border-[var(--ios-separator)]" : "border-b border-transparent")}>
      <div className="z-10 flex items-center gap-2 min-w-[80px] h-full">
        {onClose && (
          <button
            type="button"
            onClick={handleRequestClose}
            className="flex items-center gap-1 text-[17px] font-normal text-[var(--ios-blue)] hover:opacity-80 tracking-[-0.3px] pr-2 h-full -ml-1 active:opacity-55 active:scale-[0.97] transition-[opacity,transform] duration-150 select-none cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="max-w-[120px] truncate">{backLabel}</span>
          </button>
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-24">
        <div className="pointer-events-auto flex items-center justify-center max-w-full">
          {titleView ? titleView : (
            <h3 className="text-[17px] font-semibold text-[var(--ios-label)] tracking-[-0.4px] truncate text-center">
              {title}
            </h3>
          )}
        </div>
      </div>

      <div className="z-10 flex items-center justify-end gap-2.5 min-w-[80px] h-full shrink-0">
        {trailing}
      </div>
    </header>
  )

  if (!isSubView) {
    return (
      <div onScroll={handleScroll} className={"w-full min-h-[100dvh] bg-[var(--ios-bg-primary)] overflow-y-auto " + className}>
        {!hideHeader && (
          isDesktop ? desktopHeader : (
            <header className={"ios-header transition-[border-color] duration-150 " + (isScrolled ? "border-b border-[var(--ios-separator)]" : "border-b border-transparent")}>
              {headerContent}
            </header>
          )
        )}

        <div className={contentClassName ?? (isDesktop ? "px-5 pt-4 max-w-[860px] mx-auto w-full pb-10" : "px-4 pt-4 max-w-[402px] mx-auto w-full pb-[max(calc(env(safe-area-inset-bottom,0px)+2rem),2.5rem)]")}>
          {!hideHeader && largeTitle && !isDesktop && (
            <div className="pt-2 pb-3 select-none">
              <h1 className="text-[34px] font-bold text-[var(--ios-label)] tracking-[-0.4px] leading-[41px]">
                {title}
              </h1>
            </div>
          )}
          {children}
        </div>
      </div>
    )
  }

  if (typeof document === 'undefined') return null
  if (!isRendered && !isOpen) return null

  const panelTransform = isVisible
    ? (isReceded ? `translate3d(-${IOS_PARALLAX_PERCENT}%, 0, 0)` : 'translate3d(0, 0, 0)')
    : 'translate3d(100%, 0, 0)'

  const subviewDom = (
    <>
      <div
        ref={backdropRef}
        onClick={handleRequestClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: resolvedZIndex - 1,
          backgroundColor: isDesktop
            ? (isStackedOnDesktop ? 'transparent' : 'rgba(0, 0, 0, 0.52)')
            : 'var(--ios-subview-backdrop)',
          backdropFilter: isDesktop && !isStackedOnDesktop ? 'blur(6px)' : undefined,
          WebkitBackdropFilter: isDesktop && !isStackedOnDesktop ? 'blur(6px)' : undefined,
          opacity: isVisible && (isDesktop ? !isStackedOnDesktop : !isReceded) ? 1 : 0,
          pointerEvents: isVisible && !isReceded ? 'auto' : 'none',
          transition: isDesktop ? 'opacity 0.2s ease' : IOS_BACKDROP_TRANSITION,
          willChange: 'opacity'
        }}
      />

      {isDesktop ? (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 md:p-6 pointer-events-none"
          style={{ zIndex: resolvedZIndex }}
        >
          <div
            ref={panelRef}
            data-ios-subview-panel="true"
            data-ios-open={isOpen ? 'true' : 'false'}
            data-ios-z-index={String(resolvedZIndex)}
            onScroll={handleScroll}
            style={{
              position: 'relative',
              width: 'min(620px, 100%)',
              height: 'min(760px, 86vh)',
              maxHeight: '86vh',
              backgroundColor: 'var(--ios-modal-bg)',
              borderRadius: '34px',
              border: '1px solid var(--ios-border)',
              boxShadow: 'none',
              overflowY: 'auto',
              transform: isStackedOnDesktop
                ? 'scale3d(1, 1, 1)'
                : (isVisible ? 'scale3d(1, 1, 1)' : 'scale3d(0.95, 0.95, 1)'),
              opacity: isVisible ? 1 : 0,
              transition: isStackedOnDesktop
                ? 'opacity 0.16s ease'
                : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: isVisible && !isReceded ? 'auto' : 'none'
            }}
            className={className}
          >
            {!hideHeader && desktopHeader}
            <div
              className={
                (contentClassName ?? "px-5 pt-4 pb-6 w-full flex-1") +
                " ios-modal-content-transition transition-opacity duration-150 " +
                (isReceded ? "opacity-0 pointer-events-none" : "opacity-100")
              }
            >
              {children}
            </div>
          </div>
        </div>
      ) : (
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
            inset: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: resolvedZIndex,
            backgroundColor: 'var(--ios-bg)',
            boxShadow: 'none',
            willChange: 'transform',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            touchAction: 'pan-y',
            overflowY: 'auto',
            transform: panelTransform,
            transition: IOS_PANEL_TRANSITION,
            pointerEvents: isReceded ? 'none' : 'auto'
          }}
          className={className}
        >
          {!hideHeader && (
            <header className={"ios-header transition-[border-color] duration-150 " + (isScrolled ? "border-b border-[var(--ios-separator)]" : "border-b border-transparent")}>
              {headerContent}
            </header>
          )}

          <div className={contentClassName ?? "px-4 pt-5 max-w-[402px] mx-auto w-full pb-[max(calc(env(safe-area-inset-bottom,0px)+3rem),3.5rem)]"}>
            {!hideHeader && largeTitle && (
              <div className="pt-2 pb-3 select-none">
                <h1 className="text-[34px] font-bold text-[var(--ios-label)] tracking-[-0.4px] leading-[41px]">
                  {title}
                </h1>
              </div>
            )}
            {children}
          </div>
        </div>
      )}
    </>
  )

  return createPortal(subviewDom, document.body)
}
