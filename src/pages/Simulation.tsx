import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { PanelLeft, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Thread } from '@/components/sim/Thread'
import { SimHeader } from '@/components/sim/SimHeader'
import { useSimData } from '@/components/sim/sim-context'
import { Pill, bannerAction } from '@/components/sim/atoms'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/store/app'
import { useMedia } from '@/lib/hooks'
import Overview, { ComparePanel } from './tabs/Overview'
import Pricing from './tabs/Pricing'
import Costing from './tabs/Costing'
import Margin from './tabs/Margin'

function Pending({ title, question }: { title: string; question: boolean }) {
  const ui = useApp((s) => s.ui); const setUI = useApp((s) => s.setUI)
  return (
    <div className="flex min-w-0 flex-1 flex-col" data-testid="sim-pending">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-8">
        <button aria-label="Toggle sidebar" onClick={() => setUI({ sidebarOpen: !ui.sidebarOpen })} title="Show or hide the sidebar" className="hidden rounded-md border bg-background p-2 text-foreground hover:bg-accent md:block"><PanelLeft className="size-4" /></button>
        <span className="text-sm text-muted-foreground">Simulations</span><span className="text-subtle">/</span><span className="truncate text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <div className="flex items-center gap-3"><h1 className="text-[28px] font-semibold leading-9 tracking-tight">{title}</h1><Pill>{question ? 'Waiting for your answer' : 'Running'}</Pill></div>
        <p className="text-sm text-muted-foreground">{question ? 'The agent found a conflict in the sources and needs your answer in the Ask AI panel.' : 'The agent is gathering and checking the data. The simulation appears here as soon as the engine has run.'}</p>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] rounded-[10px]" />)}</div>
        <Skeleton className="h-[190px] rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-2"><Skeleton className="h-[230px] rounded-xl" /><Skeleton className="h-[230px] rounded-xl" /></div>
      </div>
    </div>
  )
}

const ASK_MIN = 360, ASK_MAX = 480, ASK_DEFAULT = 400
const clampAsk = (w: number) => Math.min(ASK_MAX, Math.max(ASK_MIN, Math.round(w)))
const savedAskWidth = () => { try { const w = Number(localStorage.getItem('evs.askWidth')); return w ? clampAsk(w) : ASK_DEFAULT } catch { return ASK_DEFAULT } }

/** Drag the panel's left edge to resize it. Arrow keys nudge it, double-click resets. */
function ResizeHandle({ width, onChange }: { width: number; onChange: (w: number) => void }) {
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    document.body.style.userSelect = 'none'
    const move = (ev: PointerEvent) => onChange(window.innerWidth - ev.clientX)
    const stop = () => { document.body.style.userSelect = ''; el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', stop); el.removeEventListener('pointercancel', stop) }
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop)
  }
  return (
    <div
      role="separator" aria-orientation="vertical" aria-label="Resize Ask AI panel" aria-valuemin={ASK_MIN} aria-valuemax={ASK_MAX} aria-valuenow={width} tabIndex={0}
      title="Drag to resize"
      onPointerDown={start}
      onDoubleClick={() => onChange(ASK_DEFAULT)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(width + 16) } if (e.key === 'ArrowRight') { e.preventDefault(); onChange(width - 16) } }}
      className="group absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none outline-none"
    >
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-active:bg-primary" />
    </div>
  )
}

export default function Simulation() {
  const { id } = useParams()
  const sim = useApp((s) => (id ? s.sims[id] : undefined))
  const ui = useApp((s) => s.ui); const setUI = useApp((s) => s.setUI)
  const data = useSimData(sim)
  const wide = useMedia('(min-width: 1280px)')
  const [askMobile, setAskMobile] = useState(false)
  const [askWidth, setAskWidthState] = useState(savedAskWidth)
  const setAskWidth = (w: number) => { const c = clampAsk(w); setAskWidthState(c); try { localStorage.setItem('evs.askWidth', String(c)) } catch { /* width just won't be remembered */ } }
  const tabKey = sim?.view.tab
  // A new tab starts at its top, so its first section title is never left scrolled out of view under the tabs.
  useEffect(() => { document.getElementById('sim-scroll')?.scrollTo({ top: 0 }) }, [tabKey, id])
  // The overlay version closes on Escape.
  useEffect(() => {
    if (wide || !askMobile) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setAskMobile(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [wide, askMobile])
  if (!sim) return <Navigate to="/" replace />

  const pending = !data
  const askOpen = pending ? true : wide ? ui.askOpen : askMobile
  const toggleAsk = () => (wide ? setUI({ askOpen: !ui.askOpen }) : setAskMobile((v) => !v))
  const closeAsk = () => (wide ? setUI({ askOpen: false }) : setAskMobile(false))
  const question = sim.thread.some((m) => m.kind === 'question' && !m.answered)

  const askPanel = (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-l bg-background" aria-label="Ask AI">
      <div className="flex h-14 shrink-0 items-center border-b pl-4 pr-3">
        <h2 className="text-base font-semibold">Ask AI</h2><span className="flex-1" />
        {!pending && <button aria-label="Close Ask AI" title="Close" onClick={closeAsk} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-4" /></button>}
      </div>
      <Thread simId={sim.id} compact />
    </aside>
  )

  const tab = sim.view.tab
  const stale = data?.run.productSig ? data.run.input.productIds.filter((pid) => { const pr = data.ctx.products.find((x) => x.id === pid); return JSON.stringify([pr?.recipe, pr?.composition]) !== data.run.productSig![pid] }) : []
  return (
    <div className="flex min-h-0 flex-1">
      {pending ? <Pending title={sim.title} question={question} /> : (
        <div className="flex min-w-0 flex-1 flex-col">
          <SimHeader data={data} askOpen={askOpen} onToggleAsk={toggleAsk} />
          {stale.length > 0 && (
            <div className="flex items-center gap-2.5 border-b bg-warning-bg px-4 py-2.5 text-sm text-warning-fg sm:px-8" data-testid="stale-banner">
              <span className="font-medium">Recipe changed since v{data.run.version}.</span><span className="flex-1">The product definition was edited after this run.</span>
              <button className={bannerAction} onClick={() => { useApp.getState().addRun(sim.id, { ...data.run.input, comment: 'Re-run after product change' }, 'user', 'Re-run after product change'); toast('Re-ran as v' + (sim.runs.length + 1)) }}>Re-run</button>
            </div>
          )}
          <div className="@container min-h-0 flex-1 scroll-pt-5 space-y-12 overflow-y-auto px-4 py-5 sm:px-8" id="sim-scroll">
            {data.compare && <ComparePanel data={data} />}
            {tab !== 'overview' && data.input.productIds.length > 1 && <p className="text-[13px] text-muted-foreground">Showing <b className="font-medium text-foreground">{data.result.name}</b> · change the product on the Overview tab</p>}
            {tab === 'costing' && <Costing data={data} />}
            {tab === 'pricing' && <Pricing data={data} />}
            {tab === 'margin' && <Margin data={data} />}
            {tab === 'overview' && <Overview data={data} />}
          </div>
        </div>
      )}
      {askOpen && wide && <div className="relative hidden h-full shrink-0 xl:block" style={{ width: askWidth }}><ResizeHandle width={askWidth} onChange={setAskWidth} />{askPanel}</div>}
      {!wide && !askOpen && <button onClick={() => setAskMobile(true)} className="fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg" aria-label="Open Ask AI"><Sparkles className="size-4" />Ask AI</button>}
      {askOpen && !wide && <div className="fixed inset-0 z-40 flex justify-end bg-black/40 duration-200 animate-in fade-in" onClick={pending ? undefined : closeAsk}><div className="h-full w-full max-w-[400px] bg-background shadow-xl duration-200 animate-in slide-in-from-right" role="dialog" aria-modal="true" aria-label="Ask AI" onClick={(e) => e.stopPropagation()}>{askPanel}</div></div>}
    </div>
  )
}
