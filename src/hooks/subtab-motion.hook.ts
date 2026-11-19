/**
 * Hook: Ephemeral Directional Sub-tab Motion
 * Applies directional entrance classes only during active sub-tab transitions and clears them after completion.
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export function useSubTabMotion(durationMs = 230) {
  const [animClass, setAnimClass] = useState<string | undefined>(undefined)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const trigger = useCallback(
    (dir: 1 | -1) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setAnimClass(dir >= 0 ? 'subtab-enter-right' : 'subtab-enter-left')
      timerRef.current = setTimeout(() => {
        setAnimClass(undefined)
        timerRef.current = null
      }, durationMs)
    },
    [durationMs]
  )

  return { animClass, trigger }
}
