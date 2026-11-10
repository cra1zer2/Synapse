'use client'

import { useEffect } from 'react'

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !isLocked) return

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
