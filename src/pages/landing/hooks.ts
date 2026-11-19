import { useEffect, useRef, useState } from "react";

export const REDUCED_MOTION = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True while the element is at least 25% on screen. */
export function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const o = new IntersectionObserver((e) => setOn(e[0].isIntersecting), { threshold: 0.25 });
    o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, on] as const;
}

/** false for one paint after `dep` changes, then true: lets CSS height transitions play for bar charts. */
export function useGrow(dep: unknown) {
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    setGrow(false);
    let a = 0, b = 0;
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setGrow(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [dep]);
  return grow;
}
