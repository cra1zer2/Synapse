'use client'

import { useEffect, useRef } from 'react'

export function useBodyScrollLock(isLocked: boolean): void {
    const scrollYRef = useRef<number>(0)

    useEffect(() => {
        if (typeof window === 'undefined') return

        if (isLocked) {
            scrollYRef.current = window.scrollY
            document.body.style.position = 'fixed'
            document.body.style.top = `-${scrollYRef.current}px`
            document.body.style.width = '100%'
            document.body.style.overflow = 'hidden'
        } else {
            const prevY = Math.abs(parseInt(document.body.style.top || '0', 10)) || scrollYRef.current
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            document.body.style.overflow = ''
            if (prevY > 0) {
                window.scrollTo(0, prevY)
            }
        }

        return () => {
            const prevY = Math.abs(parseInt(document.body.style.top || '0', 10)) || scrollYRef.current
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            document.body.style.overflow = ''
            if (isLocked && prevY > 0) {
                window.scrollTo(0, prevY)
            }
        }
    }, [isLocked])
}

export default useBodyScrollLock