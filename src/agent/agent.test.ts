import { beforeAll, describe, expect, it } from 'vitest'

// Minimal browser shims so the zustand store (persist) works under node.
beforeAll(() => {
  const mem = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0,
  } as Storage
  ;(globalThis as unknown as { __EVS_FAST__: boolean }).__EVS_FAST__ = true
})

describe('scripted agent · hero path', () => {
  it('prices Phosfusion 65-35 vs TSP, asks the S1 question, then runs v1; what-if creates v2', async () => {
    const { useApp } = await import('@/store/app')
    const { handleMessage, answerQuestion, applyChange } = await import('./script')
    const id = await handleMessage(null, 'Price Phosfusion 65-35 against TSP')
    // wait for the question
    const waitFor = async (fn: () => boolean, ms = 4000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 10)) } }
    await waitFor(() => useApp.getState().sims[id].thread.some((m) => m.kind === 'question'))
    let sim = useApp.getState().sims[id]
    expect(sim.runs).toHaveLength(0)
    expect(sim.thread.some((m) => m.kind === 'flag' && m.flag.code === 'D1')).toBe(true)
    const q = sim.thread.find((m) => m.kind === 'question')!
    await answerQuestion(id, q.id, 'standard')
    await waitFor(() => useApp.getState().sims[id].runs.length === 1 && !useApp.getState().sims[id].busy)
    sim = useApp.getState().sims[id]
    const r1 = sim.runs[0].output.perProduct['phos-65-35']
    expect(r1.anchorPrice).toBeCloseTo(313.91, 2)
    expect(r1.prices.costPlus).toBeCloseTo(373.08, 2)
    expect(sim.thread.some((m) => m.kind === 'result')).toBe(true)

    await handleMessage(id, 'What if the value share is 50%?')
    await waitFor(() => useApp.getState().sims[id].thread.some((m) => m.kind === 'change'))
    const ch = useApp.getState().sims[id].thread.find((m) => m.kind === 'change')!
    await applyChange(id, ch.id)
    sim = useApp.getState().sims[id]
    expect(sim.runs).toHaveLength(2)
    expect(sim.runs[1].output.perProduct['phos-65-35'].prices.value).toBeCloseTo(791.48, 2)
    expect(sim.runs[0].output.perProduct['phos-65-35'].prices.value).toBeCloseTo(740.99, 2) // v1 immutable
  })

  it('choosing the deck cost (494) flips the reference margin to +146', async () => {
    const { useApp } = await import('@/store/app')
    const { handleMessage, answerQuestion } = await import('./script')
    const id = await handleMessage(null, 'Price Phosfusion 65-35 against TSP')
    const waitFor = async (fn: () => boolean) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > 4000) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 10)) } }
    await waitFor(() => useApp.getState().sims[id].thread.some((m) => m.kind === 'question'))
    const q = useApp.getState().sims[id].thread.find((m) => m.kind === 'question')!
    await answerQuestion(id, q.id, 'deck')
    await waitFor(() => useApp.getState().sims[id].runs.length === 1)
    expect(useApp.getState().sims[id].runs[0].output.perProduct['phos-65-35'].cgmRef).toBeCloseTo(146, 2)
  })
})
