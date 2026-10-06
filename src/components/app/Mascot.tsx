import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Sprite sheet built from the mascot video: 110 frames of 256×256, 10 columns × 11 rows, 16 fps.
// Every frame shares the same canvas and the last frame equals the first, so playback starts and ends on the idle pose with no jump.
const SPRITE = '/mascot-sprite.webp'
const IDLE = '/mascot-idle.png'
const N = 110, COLS = 10, ROWS = 11, FPS = 16

/** The mascot stands still, then every 14–26 seconds plays its calculator-and-glasses routine (once, ~7 s). */
export function Mascot({ size = 160, className, idleMs = [14000, 26000] }: { size?: number; className?: string; idleMs?: [number, number] }) {
  const [frame, setFrame] = useState(0)
  const [ready, setReady] = useState(false)
  const playing = useRef(false)
  const raf = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setReady(true)
    img.src = SPRITE
  }, [])

  useEffect(() => {
    if (!ready) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const schedule = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(play, idleMs[0] + Math.random() * (idleMs[1] - idleMs[0]))
    }
    const play = () => {
      if (reduce || playing.current) return
      if (document.hidden) { schedule(); return }
      playing.current = true
      const t0 = performance.now()
      const tick = (t: number) => {
        const f = Math.min(N - 1, Math.floor(((t - t0) / 1000) * FPS))
        setFrame(f)
        if (f >= N - 1) { playing.current = false; setFrame(0); schedule(); return }
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }
    const now = () => { clearTimeout(timer.current); play() }
    window.addEventListener('evs:mascot-play', now)
    schedule()
    return () => { window.removeEventListener('evs:mascot-play', now); clearTimeout(timer.current); cancelAnimationFrame(raf.current); playing.current = false }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const col = frame % COLS, row = Math.floor(frame / COLS)
  return (
    <div
      role="img"
      aria-label="Eco Value Simulator mascot"
      className={cn('shrink-0 select-none', className)}
      style={{
        width: size, height: size,
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url(${ready ? SPRITE : IDLE})`,
        backgroundSize: ready ? `${COLS * size}px ${ROWS * size}px` : `${size}px ${size}px`,
        backgroundPosition: ready ? `${-col * size}px ${-row * size}px` : '0 0',
      }}
    />
  )
}
