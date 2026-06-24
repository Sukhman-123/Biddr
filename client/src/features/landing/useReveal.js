import { useEffect, useRef, useState } from 'react'

// Adds the class `is-visible` to the returned element once it scrolls
// into the viewport. Uses IntersectionObserver under the hood; falls back
// to immediately marking visible if the API is unavailable (very old
// browsers, jsdom tests) or the user prefers reduced motion.
//
// Options:
//   threshold: 0–1, how much of the element must be visible (default 0.12)
//   rootMargin: IntersectionObserver root margin (default '0px 0px -8% 0px')
//   once: stop observing after first reveal (default true)
//   delay: ms delay before applying the visible class (for stagger)

export default function useReveal({
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  once = true,
  delay = 0,
} = {}) {
  const ref = useRef(null)

  // Decide the initial visibility synchronously: if there's no IO API
  // or the user prefers reduced motion, start visible. Otherwise start
  // hidden and let the observer flip it on mount. This avoids calling
  // setState inside the effect.
  const [visible, setVisible] = useState(() => {
    if (typeof IntersectionObserver === 'undefined') return true
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return true
    }
    return false
  })

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    // No IO or reduced motion → already visible, no need to observe.
    if (typeof IntersectionObserver === 'undefined') return undefined
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => setVisible(true), delay)
            } else {
              setVisible(true)
            }
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setVisible(false)
          }
        })
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once, delay])

  return [ref, visible]
}