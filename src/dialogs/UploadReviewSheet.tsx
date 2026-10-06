import { Check, FileText, TriangleAlert, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Pill, SourceChip } from '@/components/sim/atoms'
import type { UploadFile } from '@/engine/types'
import { dayLong, sleep } from '@/lib/format'
import { useApp, uid } from '@/store/app'

export const pendingFile: { current: File | null } = { current: null }

interface Found { name: string; size: string; type: UploadFile['type']; typeLabel: string; fileDate: string; dataThrough: string; series: string; affects: string[]; resolves: boolean; warn?: string }
const TYPE_LABEL: Record<UploadFile['type'], string> = { prices: 'Prices', freight: 'Freight', agro: 'Agro tests', crop: 'Crop prices' }

function parseDate(name: string, fallback: number): string {
  let m = name.match(/(\d{2})-(\d{2})-(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = name.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return new Date(fallback).toISOString().slice(0, 10)
}
function detect(name: string, size: number, last: number): Found {
  const n = name.toLowerCase()
  const type: UploadFile['type'] = /freight/.test(n) ? 'freight' : /agro|trial/.test(n) ? 'agro' : /crop/.test(n) ? 'crop' : 'prices'
  const date = parseDate(name, last)
  const affects = { prices: ['TSP FOB price', 'DAP FOB price', 'MAP FOB price'], freight: ['Freight rates'], agro: ['Yield gain', 'Application rate'], crop: ['Crop price'] }[type]
  return { name, size: size > 1e6 ? `${(size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`, type, typeLabel: type === 'prices' ? (/argus/.test(n) ? 'Prices — Argus FOB Morocco' : 'Prices — CRU weekly averages') : TYPE_LABEL[type], fileDate: date, dataThrough: date, series: type === 'prices' ? 'DAP, MAP, TSP · low / high · 3 products' : type === 'freight' ? '10 commodity tabs' : type === 'agro' ? 'Trials by crop' : '1 crop', affects, resolves: type === 'prices' && date > '2026-06-01', warn: type === 'prices' && /argus/.test(n) ? 'TSP FOB quote: low 710 > high 691. The low quote is higher than the high quote — check the Argus file. Low will be used.' : undefined }
}

export function UploadReviewSheet() {
  const open = useApp((s) => s.ui.uploadReviewOpen); const setUI = useApp((s) => s.setUI); const add = useApp((s) => s.addUpload)
  const [stage, setStage] = useState<'pick' | 'reading' | 'found'>('pick')
  const [found, setFound] = useState<Found | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const start = async (f: Found) => { setStage('reading'); setFound(f); await sleep(900); setStage('found') }
  useEffect(() => {
    if (!open) return
    if (pendingFile.current) { const f = pendingFile.current; pendingFile.current = null; void start(detect(f.name, f.size, f.lastModified)) } else { setStage('pick'); setFound(null) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => setUI({ uploadReviewOpen: false })
  const use = () => {
    if (!found) return
    add({ id: uid('u'), name: found.name, type: found.type, uploadedAt: '2026-10-02', fileDate: found.fileDate, dataThrough: found.dataThrough, detail: found.series })
    close(); toast('Data added', { description: found.resolves ? 'The prices/freight discrepancy flag is resolved.' : found.name })
  }
  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetDescription className="sr-only">Review an uploaded file before using it</SheetDescription>
        <div className="flex h-16 shrink-0 flex-col justify-center border-b pl-5 pr-14"><SheetTitle className="text-base">{stage === 'found' ? 'What I found' : 'Upload document'}</SheetTitle><p className="text-xs text-muted-foreground">{stage === 'found' ? 'Review before this data is used in simulations' : 'The type is detected automatically'}</p></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {stage === 'pick' && (
            <div className="space-y-3">
              <button onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center hover:bg-accent"><Upload className="size-5" /><span className="text-sm font-medium">Choose a file</span><span className="text-xs text-muted-foreground">.xlsx or .csv · Prices, freight, agro tests, crop prices</span></button>
              <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void start(detect(f.name, f.size, f.lastModified)) }} />
              <div className="text-center text-xs text-muted-foreground">or try a sample</div>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => void start(detect('argus-fob-morocco-30-09-2026.xlsx', 48 * 1024, Date.now()))}><FileText className="size-4" />argus-fob-morocco-30-09-2026.xlsx</Button>
            </div>
          )}
          {found && stage !== 'pick' && (
            <>
              <div className="flex items-center gap-3 rounded-[10px] border p-3"><FileText className="size-5" /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{found.name}</div><div className="text-xs text-muted-foreground">{found.size}{stage === 'found' ? ' · read in 0.8 s' : ''}</div></div>{stage === 'found' ? <Pill><Check className="size-3" />Read</Pill> : <span className="size-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />}</div>
              {stage === 'reading' && <p className="text-sm text-muted-foreground">Reading “{found.name}”…</p>}
              {stage === 'found' && (
                <>
                  <div className="overflow-hidden rounded-[10px] border text-[13px]">
                    {([['Detected type', found.typeLabel, false], ['File date', dayLong(found.fileDate), true], ['Data through', `${dayLong(found.dataThrough)} (last row)`, true], ['Series', found.series, false]] as const).map(([k, v, mono]) => (
                      <div key={k} className="flex gap-3 border-b px-3.5 py-2.5"><span className="w-[110px] shrink-0 text-muted-foreground">{k}</span><span className={`font-medium ${mono ? 'num' : ''}`}>{v}</span></div>))}
                    <div className="flex gap-3 px-3.5 py-2.5"><span className="w-[110px] shrink-0 text-muted-foreground">Affects</span><span className="flex flex-wrap gap-1.5">{found.affects.map((a) => <SourceChip key={a}>{a}</SourceChip>)}</span></div>
                  </div>
                  {found.resolves && <div className="flex items-start gap-2.5 rounded-lg bg-muted p-3"><Check className="mt-0.5 size-4" /><div><div className="text-[13px] font-medium">Resolves a flag</div><div className="text-xs text-muted-foreground">Prices will be 6 days apart from freight (24 Sep) — within the 2-month threshold.</div></div></div>}
                  {found.warn && <div className="flex items-start gap-2.5 rounded-lg bg-warning-bg p-3 text-warning-fg"><TriangleAlert className="mt-0.5 size-4" /><div><div className="text-[13px] font-medium">TSP FOB quote: low 710 &gt; high 691</div><div className="text-xs opacity-80">{found.warn.split('. ').slice(1).join('. ')}</div></div></div>}
                </>
              )}
            </>
          )}
        </div>
        <div className="flex h-16 shrink-0 items-center justify-end gap-2 border-t px-5"><Button variant="ghost" onClick={close}>Cancel</Button><Button onClick={use} disabled={stage !== 'found'}>Use this data</Button></div>
      </SheetContent>
    </Sheet>
  )
}
