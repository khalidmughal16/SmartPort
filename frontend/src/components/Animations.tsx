'use client'
import { useEffect } from 'react'

/**
 * Scroll-reveal with a different animation per kind of element.
 * Adds data-an="<variant>" to matching elements, reveals them when they scroll into view,
 * then removes the attribute again so the element's own hover/transform styles are untouched.
 * The hero (.ph) and the feature belt are never touched. Skipped for prefers-reduced-motion.
 */
type Rule = [selector: string, variant: string, stagger?: number]

const RULES: Rule[] = [
  ['.sec .k', 'left'],                    // small eyebrow labels slide in from the left
  ['.sec h2', 'rise'],                    // headings rise up out of a blur
  ['.sec p.sub', 'rise', 120],            // sub-lines follow the heading
  ['.gr > .tile', 'card', 140],           // stat tiles: 3D card entrance + hover tilt
  ['.sx-win', 'tilt'],                    // dashboard window tilts into place
  ['#features .sx-tabs', 'rise'],
  ['#how li, #how article', 'pop', 120],  // steps pop in one by one
  ['#roles .rl > li', 'left', 90],        // client feature list slides in
  ['.rl2 > .rv', 'card', 160],            // video cards: 3D card entrance + hover tilt
  ['.fqs > .fq', 'alt', 90],              // FAQ rows come in from alternating sides
  ['.lc h2', 'wipe'],                     // modules heading is revealed with a wipe
  ['.cta h2', 'zoom'],                    // CTA heading zooms in
  ['.cta p', 'pop', 150],                 // CTA buttons pop
  ['.fcols > div', 'rise', 120],          // footer columns
]

export function Animations() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const seen = new Set<HTMLElement>()
    RULES.forEach(([sel, variant, stagger = 0]) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (el.closest('.ph, .belt, .rdlg')) return
        const sibs = el.parentElement ? Array.from(el.parentElement.children) : []
        const i = Math.max(0, sibs.indexOf(el))
        const v = variant === 'alt' ? (i % 2 === 0 ? 'left' : 'right') : variant
        el.dataset.an = v
        if (v === 'card') el.style.setProperty('--ry0', (i % 2 === 0 ? -16 : 16) + 'deg')
        el.style.setProperty('--d', Math.min(i * stagger, 600) + 'ms')
        seen.add(el)
      })
    })
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return
      const el = e.target as HTMLElement
      io.unobserve(el)
      el.classList.add('an-in')
      const d = parseInt(el.style.getPropertyValue('--d')) || 0
      const isCard = el.dataset.an === 'card'
      window.setTimeout(() => {
        delete el.dataset.an; el.classList.remove('an-in'); el.style.removeProperty('--d'); el.style.removeProperty('--ry0')
        if (isCard) el.classList.add('cardtilt')
      }, d + (isCard ? 1500 : 1300))
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    seen.forEach((el) => io.observe(el))

    // hover: cards tilt towards the pointer and catch a soft light (mouse / pen only)
    const cleanups: (() => void)[] = []
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      seen.forEach((el) => {
        if (!el.matches('.rv, .gr > .tile')) return
        const move = (e: PointerEvent) => {
          if (!el.classList.contains('cardtilt')) return
          const r = el.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
          el.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg')
          el.style.setProperty('--ry', ((x - 0.5) * 11).toFixed(2) + 'deg')
          el.style.setProperty('--mx', (x * 100).toFixed(1) + '%')
          el.style.setProperty('--my', (y * 100).toFixed(1) + '%')
        }
        const leave = () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') }
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave)
        cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) })
      })
    }
    return () => { io.disconnect(); cleanups.forEach((f) => f()); seen.forEach((el) => { delete el.dataset.an; el.classList.remove('an-in', 'cardtilt') }) }
  }, [])
  return null
}
