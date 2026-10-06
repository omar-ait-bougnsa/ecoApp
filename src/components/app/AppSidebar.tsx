import { Box, ChevronsUpDown, MoreHorizontal, Moon, Plus, RotateCcw, Search, Settings, Sun, Monitor, Upload } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useApp } from '@/store/app'
import { cn } from '@/lib/utils'
import { Dot } from '@/components/sim/atoms'
import { useFreshness } from './FreshnessChip'
import { Mascot } from './Mascot'
import { toast } from 'sonner'

function group(createdAt: string): string {
  const d = createdAt.slice(0, 10)
  if (d === '2026-10-02') return 'Today'
  if (d === '2026-10-01') return 'Yesterday'
  if (d >= '2026-09-25') return 'Previous 7 days'
  return 'Older'
}

function Item({ to, icon, children, dot, end }: { to: string; icon?: React.ReactNode; children: React.ReactNode; dot?: boolean; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn('group flex h-[30px] items-center gap-2 rounded-md px-2 text-[13px] transition-colors hover:bg-accent', isActive && 'bg-accent font-medium')}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {dot && <Dot tone="warning" />}
    </NavLink>
  )
}

export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate(); const loc = useLocation()
  const sims = useApp((s) => s.sims); const order = useApp((s) => s.order)
  const setUI = useApp((s) => s.setUI); const ui = useApp((s) => s.ui)
  const rename = useApp((s) => s.renameSim); const del = useApp((s) => s.deleteSim); const dup = useApp((s) => s.duplicateSim); const reset = useApp((s) => s.reset)
  const fresh = useFreshness()
  const groups: Record<string, string[]> = {}
  ;[...order].sort((a, b) => sims[b].createdAt.localeCompare(sims[a].createdAt)).forEach((id) => { (groups[group(sims[id].createdAt)] ??= []).push(id) })
  const go = (p: string) => { nav(p); onNavigate?.() }
  return (
    <div className="flex h-full flex-col gap-2 p-3" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) onNavigate?.() }}>
      <button onClick={() => go('/')} className="flex items-center gap-2 rounded-md px-1 py-1 text-left">
        <Mascot size={44} className="-my-2 -ml-2.5 -mr-1.5" />
        <span className="text-sm font-semibold">Eco Value Simulator</span>
      </button>
      <button onClick={() => go('/')} className="flex h-[34px] items-center gap-1.5 rounded-md border bg-background px-3 text-[13px] font-medium transition-colors hover:bg-accent">
        <Plus className="size-3.5" /> New simulation <span className="ml-auto text-[11px] font-normal text-muted-foreground">⌘N</span>
      </button>
      <button onClick={() => setUI({ commandOpen: true })} className="flex h-8 items-center gap-2 rounded-md bg-muted px-2.5 text-[13px] text-muted-foreground hover:bg-accent">
        <Search className="size-3.5" /> Search <span className="ml-auto text-[11px]">⌘K</span>
      </button>
      <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-0.5 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">History</div>
        {['Today', 'Yesterday', 'Previous 7 days', 'Older'].filter((g) => groups[g]).map((g) => (
          <div key={g}>
            <div className="px-2 pb-0.5 pt-2 text-[11px] text-subtle">{g}</div>
            {groups[g].map((id) => {
              const sim = sims[id]; const run = sim.runs[sim.runs.length - 1]
              const flagged = !!run?.output.flags.some((f) => f.severity === 'warning' || f.severity === 'error')
              return (
                <div key={id} className="group/item relative">
                  <Item to={`/s/${id}`} dot={flagged}>{sim.title}</Item>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button aria-label="More" className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded bg-accent text-muted-foreground hover:text-foreground group-hover/item:flex"><MoreHorizontal className="size-3.5" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem onClick={() => { const t = window.prompt('Rename simulation', sim.title); if (t) rename(id, t) }}>Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const n = dup(id); nav(`/s/${n}`) }}>Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { del(id); if (loc.pathname === `/s/${id}`) nav('/') }}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        ))}
        <div className="px-2 pb-0.5 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Library</div>
        <Item to="/products" icon={<Box className="size-4 text-muted-foreground" />}>Products</Item>
        <Item to="/uploads" icon={<Upload className="size-4 text-muted-foreground" />} dot={fresh.warn}>Uploads</Item>
      </div>
      <Item to="/parameters" icon={<Settings className="size-4 text-muted-foreground" />}>Parameters</Item>
      <div className="h-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent">
            <span className="flex size-7 items-center justify-center rounded-full border bg-muted text-[11px] font-medium">PM</span>
            <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium leading-4">Pricing manager</span><span className="block text-[11px] leading-4 text-muted-foreground">OCP · demo workspace</span></span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setUI({ theme: 'system' })}><Monitor className="size-4" /> System {ui.theme === 'system' && '✓'}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUI({ theme: 'light' })}><Sun className="size-4" /> Light {ui.theme === 'light' && '✓'}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUI({ theme: 'dark' })}><Moon className="size-4" /> Dark {ui.theme === 'dark' && '✓'}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { reset(); nav('/'); toast('Demo reset') }}><RotateCcw className="size-4" /> Reset demo data</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AppSidebar() {
  const open = useApp((s) => s.ui.sidebarOpen)
  if (!open) return null
  return (
    <aside className="hidden h-dvh w-[260px] shrink-0 border-r bg-sidebar lg:block" aria-label="Sidebar"><SidebarBody /></aside>
  )
}
