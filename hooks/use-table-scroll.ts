"use client"

import { useEffect, useRef } from "react"

/**
 * Attaches scroll listener to a table-scroll-container ref.
 * Adds/removes 'scrolled-right' class when fully scrolled right,
 * hiding the right-edge fade gradient indicator.
 */
export function useTableScroll() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      el.classList.toggle('scrolled-right', atRight)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })

    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return ref
}
