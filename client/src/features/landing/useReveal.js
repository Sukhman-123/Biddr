import { useEffect, useRef, useState } from 'react'

export default function useReveal({
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  once = true,
  delay = 0,
} = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    // No IntersectionObserver — just show immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    // Respect user motion preferences.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true)
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