import { RefObject, useEffect } from 'react'
import { film } from './film'

/**
 * Plays only the active slide's <video data-ch> from its start, and pauses when the slider is off screen
 * (resuming where it was). Before the laptop zoom has finished (film.run) slide 1 simply loops on the laptop
 * screen; when the slider starts ("sp-run") it restarts from the beginning.
 */
export function useChapterVideos(root: RefObject<HTMLElement | null>, idx: number) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const vids = [...el.querySelectorAll<HTMLVideoElement>('video[data-ch]')]
    let seen = true
    const apply = (restart: boolean) => {
      vids.forEach((v) => {
        const on = Number(v.dataset.ch) === idx
        if (on && seen && !reduced) { if (restart) v.currentTime = 0; v.play().catch(() => {}) }
        else v.pause()
      })
    }
    const onEnded = (e: Event) => { const v = e.target as HTMLVideoElement; if (!film.run && Number(v.dataset.ch) === idx) { v.currentTime = 0; v.play().catch(() => {}) } }
    const run = () => apply(true)
    const io = new IntersectionObserver((e) => { const sn = e[0].isIntersecting; film.vis = sn; if (sn !== seen) { seen = sn; apply(false) } }, { threshold: 0.05 })
    io.observe(el)
    vids.forEach((v) => v.addEventListener('ended', onEnded))
    apply(true)
    addEventListener('sp-run', run)
    return () => { io.disconnect(); removeEventListener('sp-run', run); vids.forEach((v) => v.removeEventListener('ended', onEnded)) }
  }, [root, idx])
}
