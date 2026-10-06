import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { PanelLeft, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Thread } from '@/components/sim/Thread'
import { SimHeader } from '@/components/sim/SimHeader'
import { useSimData } from '@/components/sim/sim-context'
import { Pill } from '@/components/sim/atoms'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/store/app'
import { useMedia } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import Overview, { ComparePanel } from './tabs/Overview'
import Pricing from './tabs/Pricing'
import Costing from './tabs/Costing'
import Margin from './tabs/Margin'

function Pending({ title, question }: { title: string; question: boolean }) {
  const ui = useApp((s) => s.ui); const setUI = useApp((s) => s.setUI)
  return (
    <div className="flex min-w-0 flex-1 flex-col" data-testid="sim-pending">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <button aria-label="Toggle sidebar" onClick={() => setUI({ sidebarOpen: !ui.sidebarOpen })} className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:block"><PanelLeft className="size-4" /></button>
        <span className="text-[13px] text-muted-foreground">Simulations</span><span className="text-subtle">/</span><span className="truncate text-[13px] font-medium">{title}</span>
      </div>
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3"><h1 className="text-xl font-semibold tracking-tight">{title}</h1><Pill>{question ? 'Waiting for your answer' : 'Running'}</Pill></div>
        <p className="text-sm text-muted-foreground">{question ? 'The agent found a conflict in the sources and needs your answer in the Ask AI panel.' : 'The agent is gathering and checking the data. The simulation appears here as soon as the engine has run.'}</p>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] rounded-[10px]" />)}</div>
        <Skeleton className="h-[190px] rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-2"><Skeleton className="h-[230px] rounded-xl" /><Skeleton className="h-[230px] rounded-xl" /></div>
      </div>
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
  if (!sim) return <Navigate to="/" replace />

  const pending = !data
  const askOpen = pending ? true : wide ? ui.askOpen : askMobile
  const toggleAsk = () => (wide ? setUI({ askOpen: !ui.askOpen }) : setAskMobile((v) => !v))
  const closeAsk = () => (wide ? setUI({ askOpen: false }) : setAskMobile(false))
  const question = sim.thread.some((m) => m.kind === 'question' && !m.answered)

  const askPanel = (
    <aside className="flex h-full w-full shrink-0 flex-col border-l bg-background" aria-label="Ask AI">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4" /><span className="text-sm font-semibold">Ask AI</span>{data && <Pill className="font-mono">v{data.run.version}</Pill>}<span className="flex-1" />
        {!pending && <button aria-label="Close" onClick={closeAsk} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="size-4" /></button>}
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
            <div className="flex items-center gap-2.5 border-b bg-warning-bg px-4 py-2.5 text-[13px] text-warning-fg sm:px-6" data-testid="stale-banner">
              <span className="font-medium">Recipe changed since v{data.run.version}.</span><span className="flex-1">The product definition was edited after this run.</span>
              <button className="font-medium underline underline-offset-2" onClick={() => { useApp.getState().addRun(sim.id, { ...data.run.input, comment: 'Re-run after product change' }, 'user', 'Re-run after product change'); toast('Re-ran as v' + (sim.runs.length + 1)) }}>Re-run</button>
            </div>
          )}
          <div className="@container min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" id="sim-scroll">
            {data.compare && <ComparePanel data={data} />}
            {tab !== 'overview' && data.input.productIds.length > 1 && <p className="text-xs text-muted-foreground">Showing <b className="font-medium text-foreground">{data.result.name}</b> · change the product on the Overview tab</p>}
            {tab === 'costing' && <Costing data={data} />}
            {tab === 'pricing' && <Pricing data={data} />}
            {tab === 'margin' && <Margin data={data} />}
            {tab === 'overview' && <Overview data={data} />}
          </div>
        </div>
      )}
      {askOpen && wide && <div className={cn('hidden h-full shrink-0 xl:block', pending ? 'w-[460px]' : 'w-[380px]')}>{askPanel}</div>}
      {!wide && !askOpen && <button onClick={() => setAskMobile(true)} className="fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg" aria-label="Open Ask AI"><Sparkles className="size-4" />Ask AI</button>}
      {askOpen && !wide && <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={pending ? undefined : closeAsk}><div className="h-full w-full max-w-[420px] bg-background" onClick={(e) => e.stopPropagation()}>{askPanel}</div></div>}
    </div>
  )
}
