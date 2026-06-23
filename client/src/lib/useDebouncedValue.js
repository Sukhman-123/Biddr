import { useEffect, useState } from 'react'

/**
 * Returns a value that updates only after `delay` ms of stable input.
 * Used to throttle reactive operations like search queries against an API.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}
