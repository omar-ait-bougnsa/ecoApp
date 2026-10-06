import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Ctx } from '@/engine/run'
import { diffInputs, runEngine } from '@/engine/run'
import type { Parameters, Product, Run, RunInput, UploadFile } from '@/engine/types'
import { yearPeriod } from '@/engine/period'
import { PRODUCTS } from '@/data/products'
import { SNAPSHOTS } from '@/data/snapshots'
import { SEED_UPLOADS } from '@/data/uploads'
import { DEFAULT_PARAMS, TODAY, defaultRunInput } from '@/data/defaults'
import type { AppUI, Msg, Simulation, SimView } from './types'

let seq = 0
export const uid = (p = 'm') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

interface State {
  sims: Record<string, Simulation>
  order: string[]
  products: Product[]
  uploads: UploadFile[]
  params: Parameters
  ui: AppUI
  // actions
  setUI: (p: Partial<AppUI>) => void
  setParams: (p: Partial<Parameters>) => void
  createSim: (title: string, input: RunInput) => string
  renameSim: (id: string, title: string) => void
  deleteSim: (id: string) => void
  duplicateSim: (id: string) => string
  setView: (id: string, v: Partial<SimView>) => void
  pushMsg: (simId: string, m: Msg) => string
  patchMsg: (simId: string, msgId: string, patch: Record<string, unknown>) => void
  setBusy: (simId: string, b: boolean) => void
  addRun: (simId: string, input: RunInput, by: Run['createdBy'], summary: string) => Run
  upsertProduct: (p: Product) => void
  addUpload: (u: UploadFile) => void
  reset: () => void
}

export const ctxOf = (s: Pick<State, 'products' | 'uploads' | 'params'>): Ctx => ({ products: s.products, snapshots: SNAPSHOTS, uploads: s.uploads, params: s.params })

export function makeView(over: Partial<SimView> = {}, input?: RunInput): SimView {
  return { tab: 'costing', period: input ? { from: input.periodFrom, to: input.periodTo } : yearPeriod(2026), ref: input?.referenceId ?? 'TSP', pin: 'product', version: 1, product: input?.productIds[0] ?? 'phos-65-35', strategy: 'all', metric: 'price', ...over }
}

function buildRun(state: State, sim: Simulation | null, input: RunInput, by: Run['createdBy'], summary: string): Run {
  const out = runEngine(input, ctxOf(state))
  const prev = sim?.runs[sim.runs.length - 1]
  const first = sim?.runs[0]
  const changed = prev ? diffInputs(prev.input, input).map((d) => String(d.key)) : []
  const edited = first ? diffInputs(first.input, input).map((d) => String(d.key)) : []
  const productSig = Object.fromEntries(input.productIds.map((id) => { const pr = state.products.find((x) => x.id === id); return [id, JSON.stringify([pr?.recipe, pr?.composition])] }))
  return {
    id: uid('r'), version: (sim?.runs.length ?? 0) + 1, input, output: out, productSig,
    createdAt: new Date().toISOString(), createdBy: by, summary, changed, editedKeys: edited,
  }
}

function seed(): Pick<State, 'sims' | 'order'> {
  const base = { products: PRODUCTS, uploads: SEED_UPLOADS, params: DEFAULT_PARAMS } as State
  const mk = (id: string, title: string, createdAt: string, input: RunInput, text: string): Simulation => {
    const run = buildRun(base, null, input, 'user', 'Initial run')
    const sim: Simulation = {
      id, title, createdAt, runs: [run], view: makeView({}, input),
      thread: [
        { id: uid(), kind: 'user', text: title.replace(/ vs /, ' against ') },
        { id: uid(), kind: 'tool', label: 'Pricing engine · 4 methods · v1' },
        { id: uid(), kind: 'text', text },
        { id: uid(), kind: 'result', version: 1 },
      ],
    }
    return sim
  }
  const s2 = mk('s2', 'Phosfusion 50-50 vs DAP', '2026-10-01T10:12:00', defaultRunInput(DEFAULT_PARAMS, { productIds: ['phos-50-50'], referenceId: 'DAP', resolved: { S1: 'n/a' } }),
    'Phosfusion 50-50 anchors at 265.4 USD/t against DAP — below its cost-plus floor of 324.40. DAP’s own margin is deeply negative at today’s sulphur price.')
  const s3 = mk('s3', 'Sulphur spike sensitivity', '2026-09-28T16:40:00', defaultRunInput(DEFAULT_PARAMS, { periodFrom: '2025-01-01', periodTo: '2025-12-31', productIds: ['phos-65-35'], resolved: { S1: 'n/a' } }),
    'Under 2025 conditions sulphur was 299 USD/t, not 900. The anchor rises above the floor and TSP earns 182 USD/t.')
  return { sims: { s2, s3 }, order: ['s2', 's3'] }
}

const freshUI = (): AppUI => ({ theme: 'system', sidebarOpen: true, askOpen: true, commandOpen: false, runFormOpen: false, memoOpen: false, hypothesesOpen: false, productSheetId: null, uploadReviewOpen: false, compareWith: null })

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ...seed(),
      products: PRODUCTS,
      uploads: SEED_UPLOADS,
      params: DEFAULT_PARAMS,
      ui: freshUI(),
      setUI: (p) => set((s) => ({ ui: { ...s.ui, ...p } })),
      setParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),
      createSim: (title, input) => {
        const id = uid('s')
        const sim: Simulation = { id, title, createdAt: `${TODAY}T${new Date().toTimeString().slice(0, 8)}`, runs: [], thread: [], view: makeView({}, input) }
        set((s) => ({ sims: { ...s.sims, [id]: sim }, order: [id, ...s.order] }))
        return id
      },
      renameSim: (id, title) => set((s) => ({ sims: { ...s.sims, [id]: { ...s.sims[id], title } } })),
      deleteSim: (id) => set((s) => { const { [id]: _x, ...rest } = s.sims; void _x; return { sims: rest, order: s.order.filter((o) => o !== id) } }),
      duplicateSim: (id) => {
        const src = get().sims[id]; const nid = uid('s')
        set((s) => ({ sims: { ...s.sims, [nid]: { ...src, id: nid, title: src.title + ' (copy)', createdAt: `${TODAY}T${new Date().toTimeString().slice(0, 8)}` } }, order: [nid, ...s.order] }))
        return nid
      },
      setView: (id, v) => set((s) => (s.sims[id] ? { sims: { ...s.sims, [id]: { ...s.sims[id], view: { ...s.sims[id].view, ...v } } } } : s)),
      pushMsg: (simId, m) => { set((s) => (s.sims[simId] ? { sims: { ...s.sims, [simId]: { ...s.sims[simId], thread: [...s.sims[simId].thread, m] } } } : s)); return m.id },
      patchMsg: (simId, msgId, patch) => set((s) => (s.sims[simId] ? { sims: { ...s.sims, [simId]: { ...s.sims[simId], thread: s.sims[simId].thread.map((m) => (m.id === msgId ? ({ ...m, ...patch } as Msg) : m)) } } } : s)),
      setBusy: (simId, b) => set((s) => (s.sims[simId] ? { sims: { ...s.sims, [simId]: { ...s.sims[simId], busy: b } } } : s)),
      addRun: (simId, input, by, summary) => {
        const state = get(); const sim = state.sims[simId]
        const run = buildRun(state, sim, input, by, summary)
        set((s) => ({ sims: { ...s.sims, [simId]: { ...s.sims[simId], runs: [...s.sims[simId].runs, run], view: { ...s.sims[simId].view, version: run.version, period: { from: input.periodFrom, to: input.periodTo }, ref: input.referenceId, product: input.productIds[0] } } } }))
        return run
      },
      upsertProduct: (p) => set((s) => ({ products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [...s.products, p] })),
      addUpload: (u) => set((s) => ({ uploads: [u, ...s.uploads] })),
      reset: () => { localStorage.removeItem('evs.v2'); set({ ...seed(), products: PRODUCTS, uploads: SEED_UPLOADS, params: DEFAULT_PARAMS, ui: freshUI() }) },
    }),
    {
      name: 'evs.v2',
      version: 2,
      partialize: (s) => ({ sims: s.sims, order: s.order, products: s.products, uploads: s.uploads, params: s.params, ui: { ...s.ui, commandOpen: false, runFormOpen: false, memoOpen: false, hypothesesOpen: false, productSheetId: null, uploadReviewOpen: false } }),
    },
  ),
)

export const useCtx = () => {
  const products = useApp((s) => s.products); const uploads = useApp((s) => s.uploads); const params = useApp((s) => s.params)
  return { products, snapshots: SNAPSHOTS, uploads, params } as Ctx
}
