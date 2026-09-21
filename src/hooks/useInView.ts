import { useEffect, useRef, useState } from 'react'

/** Becomes true once the element gets near the viewport, and stays true. */
export function useInView<T extends Element>(enabled = true, rootMargin = '800px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(!enabled)

  useEffect(() => {
    if (!enabled || inView) return
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, inView, rootMargin])

  return [ref, inView] as const
}
