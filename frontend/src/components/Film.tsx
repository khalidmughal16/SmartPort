'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CHIPS, STORY } from '../lib/data'
import { film } from '../lib/film'
import { K, W, WG, worldMarkup } from '../lib/world'
import film0 from '../assets/film-0.jpg'
import film1 from '../assets/film-1.jpg'
import film2 from '../assets/film-2.jpg'
import film3 from '../assets/film-3.jpg'
import film4 from '../assets/film-4.jpg'
import film5 from '../assets/film-5.jpg'
import film6 from '../assets/film-6.jpg'
import film7 from '../assets/film-7.jpg'
import film8 from '../assets/film-8.jpg'
import film9 from '../assets/film-9.jpg'

const bgs = [film0, film1, film2, film3, film4, film5, film6, film7, film8, film9].map((m) => m.src)
const L = (a: number, b: number, u: number) => a + (b - a) * u
const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const sm = (u: number) => u * u * (3 - 2 * u)
const SLIDE_MS = 3000 // how long each of the 10 chapters stays on screen
const world = worldMarkup()

export function Film() {
  const root = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  // Light mode: use /public/film-light/<n>.jpg when it exists, otherwise the dark photo brightened by CSS.
  const [light, setLight] = useState(false)
  const [lightOk, setLightOk] = useState<boolean[]>(() => bgs.map(() => false))
  useEffect(() => {
    const de = document.documentElement
    const read = () => setLight(de.getAttribute('data-theme') === 'light')
    read()
    const mo = new MutationObserver(read)
    mo.observe(de, { attributes: true, attributeFilter: ['data-theme'] })
    bgs.forEach((_, i) => {
      const im = new Image()
      im.onload = () => setLightOk((a) => a.map((v, j) => (j === i ? true : v)))
      im.src = `/film-light/${i}.jpg`
    })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const el = root.current as HTMLDivElement
    const $ = (s: string) => el.querySelector(s) as any
    const $$ = (s: string) => [...el.querySelectorAll(s)] as any[]
    const by = (id: string) => document.getElementById(id) as any
    const imgs = $$('#bg img') as HTMLElement[]
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let AP = 0, last = -1, visible = true, AT = 0, LF = 0, raf = 0
    let hold = window.parent !== window // when embedded in the laptop intro, the parent releases it

    /** Updates the floating widget of the current chapter as the chapter progresses (t = 0..1). */
    const widget = (i: number, t: number) => {
      if (i === 0) {
        const r = 85 * (1 - t) + 12
        by('wb').setAttribute('cx', 100 + r * 0.62); by('wb').setAttribute('cy', 100 - r * 0.78)
        by('eta').textContent = Math.round(40 * (1 - t))
      } else if (i === 1) by('td').setAttribute('cx', 20 + 260 * t)
      else if (i === 2) by('bs').textContent = t > 0.4 ? 'Open' : 'Closed'
      else if (i === 3) { [0, 1, 2, 3].forEach((k) => by('k' + k).classList.toggle('d', t > (k + 1) / 5)); by('cs').textContent = t > 0.8 ? 'Cleared' : 'Hold' }
      else if (i === 4) by('xm').textContent = Math.round(7 * t)
      else if (i === 5) [31, 58, 97].forEach((v, k) => (by('s' + k).style.width = v * Math.min(1, t * 2) + '%'))
      else if (i === 6) by('ap2').setAttribute('stroke-dashoffset', 1 - Math.min(1, t * 1.4))
      else if (i === 7) [...by('qq').children].forEach((e: any, k) => (e.style.opacity = k <= t * 5 ? 1 : 0.3))
      else if (i === 8) by('st').style.opacity = t > 0.5 ? 1 : 0
    }

    const frame = () => {
      const p = cl(AP, 0, 0.9999), g = p * 9, a = Math.min(8, Math.floor(g)), u = sm(g - a)
      const i = Math.min(9, Math.floor(p * 10)), t = p * 10 - i, narrow = innerWidth < 700
      const cx = L(K[a][0], K[a + 1][0], u), wd = L(K[a][1], K[a + 1][1], u) * (narrow ? 1.7 : 1)
      $('#world').setAttribute('viewBox', `${cx - wd * (narrow ? 0.5 : 0.6)} 40 ${wd} ${wd * 0.5625}`)
      const x = L(W[a][0], W[a + 1][0], u), y = L(W[a][1], W[a + 1][1], u) - (g < 1 ? 90 * Math.sin(Math.PI * g) : 0)
      // background photo: Ken Burns drift on the active chapter
      imgs[i].style.transform = `scale(${1.03 + 0.07 * t}) translateX(${(t - 0.5) * -1.6}%)`
      widget(i, t)
      $('#gmt').setAttribute('transform', `translate(${x} ${y})`)
      $('#wk').setAttribute('transform', `translate(${x - 70} ${452 + Math.abs(Math.sin(g * 30)) * 2})`)
      $('#arm').setAttribute('transform', `rotate(${g > 2 && g < 3.6 ? -50 + Math.sin(g * 40) * 25 : g > 8.2 ? -40 + Math.sin(g * 40) * 25 : 10} 10 -44)`)
      const tr = $('#trk')
      tr.setAttribute('transform', `translate(${x} 0)`)
      tr.style.opacity = (g > 0.75 && g < 3.9) || g > 7.6 ? 1 : 0
      $('#bar').style.transform = `rotate(${-70 * cl((g - 2.1) * 3)}deg)`
      $('#clr').setAttribute('opacity', g > 3.4 ? 1 : 0)
      $$('.blk').forEach((e) => (e.style.opacity = g >= 5 ? 0 : ''))
      $('#ring').setAttribute('opacity', g > 5 ? 1 : 0)
      $$('.sc').forEach((e) => e.setAttribute('opacity', g > 4.6 && g < 6 ? 1 : 0))
      $('#ap').setAttribute('stroke-dashoffset', 1 - cl(g - 5.9, 0, 1))
      $('#tr').setAttribute('x', 2700 + 700 * (0.5 + 0.5 * Math.sin(g * 2.4)))
      if (i !== last) { last = i; setIdx(i) }
      $('#c1').textContent = i === 3 ? (t < 0.5 ? 'Customs hold' : 'Cleared') : STORY[i][3]
      $('#c3').textContent = i === 4 ? Math.round(7 * t) : i === 5 ? Math.round(7 * (1 - cl(t * 2))) : '0'
    }

    const goSlide = (i: number) => { AP = (i + 0.02) / 10; last = -1; frame() }
    const setSlide = (x: number) => { AP = cl(x, 0, 0.9999); last = -1; frame() }
    film.go = goSlide; film.set = setSlide

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(1000, t - AT || 0); AT = t
      if (!visible || hold || document.hidden || reduced) return
      AP += dt / (SLIDE_MS * 10)
      if (AP >= 1) AP = 0
      if (t - LF >= 45) { LF = t; frame() }
    }
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'sp-hold') return
      hold = !!e.data.hold
      if (e.data.restart) { scrollTo(0, 0); setSlide(0.002) }
    }
    const onResize = () => { last = -1; frame() }
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting }, { threshold: 0.05 })
    io.observe(el)
    addEventListener('message', onMsg); addEventListener('resize', onResize)
    frame()
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('message', onMsg); removeEventListener('resize', onResize); film.go = () => {}; film.set = () => {} }
  }, [])

  const sg = [0, 0, 1, 2, 3, 3, 3, 3, 4, 4][idx]
  return (
    <div id="film" ref={root}>
      <div className="stage" id="stage">
        <div id="bg" aria-hidden="true">{bgs.map((s, i) => { const lt = light && lightOk[i]; return <img key={i} alt="" src={lt ? `/film-light/${i}.jpg` : s} className={(i === idx ? 'on' : '') + (light && !lt ? ' fb' : '')} /> })}</div>
        <div id="wd">{WG.map((h, i) => <div key={i} className={`w${i === idx ? ' on' : ''}`} dangerouslySetInnerHTML={{ __html: h }} />)}</div>
        <svg id="world" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: world }} />
        <div id="chs">
          {STORY.map((s, i) => (
            <div className={`ch${i === idx ? ' on' : ''}`} id={'ch' + i} key={i}>
              <p className="k">{String(i + 1).padStart(2, '0')} / 10</p>
              <h1 className="hd" role={i ? 'presentation' : undefined}>{s[0]} <em>{s[1]}</em></h1>
              <p className="b">{s[2]}</p>
              {i === 0 && <p><Link className="btn p" href="/app/login">Enter Terminal</Link> <button className="btn" onClick={() => film.go(1)}>Follow the journey</button></p>}
              {i === 9 && <p><Link className="btn p" href="/app/login">Enter Terminal</Link> <button className="btn" onClick={() => film.go(0)}>Replay the journey</button></p>}
            </div>
          ))}
        </div>
        <div className="card" aria-live="off">
          <b>GMT-0042 <span style={{ color: 'var(--acc)' }}>demo</span></b>
          <div><span>Status</span><span id="c1" /></div>
          <div><span>Location</span><span id="c2">{STORY[idx][4]}</span></div>
          <div><span>Extra moves</span><span id="c3" /></div>
          <div><span>Dwell days</span><span id="c4">{STORY[idx][6]}</span></div>
        </div>
        <ol className="jr" id="jr" aria-label="Container journey">
          {['Vessel', 'Gate-in', 'Customs', 'Yard', 'Released'].map((n, i) => <li key={n} className={i < sg ? 'd' : i === sg ? 'n' : ''}>{n}</li>)}
        </ol>
        <div className="chip" id="chip">{CHIPS[idx]}</div>
      </div>
    </div>
  )
}
