import { useCallback, useRef, useState } from 'react'

export function usePendingAction() {
  const inFlight = useRef(false)
  const [pending, setPending] = useState(false)

  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) return false
    inFlight.current = true
    setPending(true)
    try {
      await action()
      return true
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }, [])

  return { pending, run }
}
