import { AlertTriangle, PanelLeft, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Pill } from '@/components/sim/atoms'
import { SNAPSHOTS } from '@/data/snapshots'
import { costLines } from '@/engine/run'
import { f2, f3 } from '@/lib/format'
import { useApp } from '@/store/app'
import { cn } from '@/lib/utils'

export default function Products() {
  const products = useApp((s) => s.products); const setUI = useApp((s) => s.setUI); const ui = useApp((s) => s.ui)
  const [q, setQ] = useState(''); const [fam, setFam] = useState('all')
  const rows = useMemo(() => products.filter((p) => (fam === 'all' || p.family === fam) && p.name.toLowerCase().includes(q.toLowerCase())), [products, q, fam])
  const cnt = (f: string) => products.filter((p) => f === 'all' || p.family === f).length
  const num = (v: number) => (v ? f3(v) : '0')
  const pc = (v: number) => (v ? String(Math.round(v * 10000) / 100) : '0')
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="hidden h-14 shrink-0 items-center border-b px-6 lg:flex"><button aria-label="Toggle sidebar" onClick={() => setUI({ sidebarOpen: !ui.sidebarOpen })} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><PanelLeft className="size-4" /></button></div>
      <div className="mx-auto w-full max-w-[1280px] space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-tight">Products</h1><p className="mt-1 text-[13px] text-muted-foreground">Recipes, composition and footprint. Unit cost is derived from the recipe × input prices.</p></div>
          <Button className="gap-1.5" onClick={() => setUI({ productSheetId: 'new' })}><Plus className="size-4" />Add product</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ToggleGroup type="single" value={fam} onValueChange={(v) => v && setFam(v)} variant="outline" size="sm">
            {[['all', 'All'], ['phosfusion', 'Phosfusion'], ['reference', 'Reference'], ['other', 'Other']].map(([k, l]) => <ToggleGroupItem key={k} value={k} className="px-3 text-[13px]">{l} {cnt(k)}</ToggleGroupItem>)}
          </ToggleGroup>
          <span className="flex-1" />
          <div className="relative w-[260px]"><Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input aria-label="Search products" className="h-8 pl-8 text-[13px]" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Button variant="outline" size="sm" className="gap-1.5"><SlidersHorizontal className="size-3.5" />Filters</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1080px] text-[13px]" data-testid="products-table">
            <thead>
              <tr className="border-b bg-muted/60 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left" /><th colSpan={5} className="border-l px-3 py-2 text-left">Recipe · t / t</th><th colSpan={4} className="border-l px-3 py-2 text-left">Composition · %</th><th className="border-l px-3 py-2 text-left">CO₂</th><th colSpan={2} className="border-l px-3 py-2 text-left">Agronomy</th><th className="border-l px-3 py-2 text-left">Cost</th><th />
              </tr>
              <tr className="border-b text-[11px] font-medium text-muted-foreground">
                <th className="px-3 py-2 text-left">Product</th>{['NH₃', 'KCl', 'Rock d.', 'Rock w.', 'Sulphur', 'N', 'P₂O₅', 'K₂O', 'S', 't CO₂/t', 't/ha', 'Δ t/ha', 'USD/t 2026', ''].map((h, i) => <th key={i} className="px-2.5 py-2 text-right">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const cost = costLines(p, SNAPSHOTS[0]).reduce((a, l) => a + l.usd, 0)
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="max-w-[300px] px-3 py-2.5"><div className="flex items-center gap-2"><span className="truncate" title={p.name}>{p.name}</span>{p.family === 'phosfusion' && <Pill>New</Pill>}{p.family === 'reference' && <Pill>Ref</Pill>}</div></td>
                    {(['ammonia', 'kcl', 'rockDry', 'rockWet', 'sulphur'] as const).map((k) => <td key={k} className={cn('num px-2.5 py-2.5 text-right text-xs', !p.recipe[k] && 'text-subtle')}>{num(p.recipe[k] ?? 0)}</td>)}
                    {(['N', 'P2O5', 'K2O', 'S'] as const).map((k) => <td key={k} className={cn('num px-2.5 py-2.5 text-right text-xs', !p.composition[k] && 'text-subtle')}>{pc(p.composition[k])}</td>)}
                    <td className="num px-2.5 py-2.5 text-right text-xs">{p.pcf == null ? <span className="text-subtle">—</span> : p.pcfPlaceholder ? <span className="inline-flex items-center gap-1 text-warning-fg"><AlertTriangle className="size-3" />{p.pcf.toFixed(2)}</span> : p.pcf.toFixed(2)}</td>
                    <td className="num px-2.5 py-2.5 text-right text-xs">{p.appRate ?? <span className="text-subtle">—</span>}</td>
                    <td className="num px-2.5 py-2.5 text-right text-xs">{p.yieldGain ?? <span className="text-subtle">—</span>}</td>
                    <td className="num px-2.5 py-2.5 text-right text-xs font-medium">{f2(cost)}</td>
                    <td className="px-2 py-1.5 text-right"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setUI({ productSheetId: p.id })}>Modify</Button></td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={15} className="p-8 text-center text-muted-foreground">No products match.</td></tr>}
            </tbody>
          </table>
          <div className="flex items-center border-t px-4 py-3 text-[13px] text-muted-foreground">{rows.length} product{rows.length === 1 ? '' : 's'}</div>
        </div>
      </div>
    </div>
  )
}
