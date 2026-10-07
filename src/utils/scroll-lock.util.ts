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
            const prevY = scrollYRef.current || Math.abs(parseInt(document.body.style.top || '0', 10))
            const originalScrollBehavior = document.documentElement.style.scrollBehavior

            document.documentElement.style.scrollBehavior = 'auto'
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            document.body.style.overflow = ''

            window.scrollTo({
                top: prevY,
                left: 0,
                behavior: 'instant'
            })

            document.documentElement.style.scrollBehavior = originalScrollBehavior
        }

        return () => {
            const prevY = scrollYRef.current || Math.abs(parseInt(document.body.style.top || '0', 10))
            const originalScrollBehavior = document.documentElement.style.scrollBehavior

            document.documentElement.style.scrollBehavior = 'auto'
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            document.body.style.overflow = ''

            if (isLocked && prevY > 0) {
                window.scrollTo({
                    top: prevY,
                    left: 0,
                    behavior: 'instant'
                })
            }

            document.documentElement.style.scrollBehavior = originalScrollBehavior
        }
    }, [isLocked])
}

export default useBodyScrollLock