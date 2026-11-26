/** Small bridge between <Film/> (the slider) and the rest of the page. */
export const film = {
  go: (_i: number) => {},
  set: (_p: number) => {},
  /** current slider progress 0..1 (the laptop screen in <PortHero/> reads this to show the very same slider) */
  p: 0,
  /** true only once the laptop zoom has finished; the slider is paused (on chapter 1) until then */
  run: false,
  /** true while the slider is on screen (set by the video hook) */
  vis: true,
  subs: new Set<() => void>(),
}
