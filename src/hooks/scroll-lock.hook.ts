'use client'

import { useEffect } from 'react'

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !isLocked) return

    const isMobileViewport = window.innerWidth < 768

    if (isMobileViewport) {
      const scrollY = Math.max(0, window.scrollY || window.pageYOffset || 0)
      const prevBodyPosition = document.body.style.position
      const prevBodyTop = document.body.style.top
      const prevBodyLeft = document.body.style.left
      const prevBodyRight = document.body.style.right
      const prevBodyWidth = document.body.style.width

      document.documentElement.style.setProperty('--ios-locked-scroll-y', scrollY + 'px')
      document.body.style.position = 'fixed'
      document.body.style.top = '-' + scrollY + 'px'
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'

      return () => {
        document.documentElement.style.removeProperty('--ios-locked-scroll-y')
        document.body.style.position = prevBodyPosition
        document.body.style.top = prevBodyTop
        document.body.style.left = prevBodyLeft
        document.body.style.right = prevBodyRight
        document.body.style.width = prevBodyWidth
        window.scrollTo(0, scrollY)
      }
    }

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyTouchAction = document.body.style.touchAction

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      document.body.style.touchAction = prevBodyTouchAction
    }
  }, [isLocked])
}

export default useBodyScrollLock
