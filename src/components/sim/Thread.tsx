import { ArrowUp, Check, ChevronDown, Copy, Paperclip, Settings2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ChatContainerContent, ChatContainerRoot } from '@/components/ui/chat-container'
import { Markdown } from '@/components/ui/markdown'
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from '@/components/ui/prompt-input'
import { PromptSuggestion } from '@/components/ui/prompt-suggestion'
import { ScrollButton } from '@/components/ui/scroll-button'
import { Steps, StepsContent, StepsItem, StepsTrigger } from '@/components/ui/steps'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { SystemMessage } from '@/components/ui/system-message'
import { applyChange, answerQuestion, dismissChange, handleMessage } from '@/agent/script'
import { useApp } from '@/store/app'
import type { Msg } from '@/store/types'
import { f2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Flag } from '@/engine/types'
import { Pill, SourceChip } from './atoms'
import { ResultCard } from './ResultCard'
import { openFlagTarget } from './flag-actions'
import { Logo } from '@/components/app/Logo'

const AVATAR = <Logo />

function Assistant({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className={cn(compact && 'scale-90')}>{AVATAR}</div>
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  )
}

function ToolRow({ label }: { label: string }) {
  const running = /running/.test(label)
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
      <Settings2 className="size-3.5" />
      <span>{label}</span>
      {running ? <TextShimmer className="text-[11px]">running</TextShimmer> : <Check className="size-3 text-foreground" />}
    </div>
  )
}

function Row({ m, simId, compact }: { m: Msg; simId: string; compact?: boolean }) {
  const send = (t: string) => void handleMessage(simId, t)
  if (m.kind === 'user')
    return (
      <div className="flex justify-end">
        <div className={cn('max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm', compact && 'text-[13px]')}>{m.text}</div>
      </div>
    )
  if (m.kind === 'text')
    return (
      <Assistant compact={compact}>
        <Markdown className={cn('prose prose-sm max-w-none text-foreground [&_p]:my-2 [&_p:first-child]:mt-0 [&_ul]:my-2 [&_strong]:font-semibold', compact ? 'text-[13px] leading-[19px]' : 'text-sm leading-[22px]')}>{m.text}</Markdown>
        {m.sources && m.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{m.sources.map((s) => <SourceChip key={s}>{s}</SourceChip>)}</div>
        )}
        {m.feedback && (
          <div className="flex gap-1 text-muted-foreground">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => { void navigator.clipboard?.writeText(m.text); toast('Copied') }}><Copy className="size-3.5" /></Button>
            <Button variant="ghost" size="icon" className="size-7"><ThumbsUp className="size-3.5" /></Button>
            <Button variant="ghost" size="icon" className="size-7"><ThumbsDown className="size-3.5" /></Button>
          </div>
        )}
      </Assistant>
    )
  if (m.kind === 'steps') {
    const done = m.steps.every((s) => s.done)
    return (
      <Assistant compact={compact}>
        <Steps defaultOpen className="rounded-[10px] border bg-background px-3 py-2.5" aria-live="polite">
          <StepsTrigger className="text-xs font-medium text-muted-foreground">{done ? `Finished in ${m.steps.length} steps` : 'Working…'}</StepsTrigger>
          <StepsContent>
            <div className="mt-2 space-y-1.5">
              {m.steps.map((s, i) => {
                const active = i === m.steps.findIndex((x) => !x.done)
                return (
                  <StepsItem key={i} className="flex items-center gap-2 text-[13px]">
                    {s.done ? <Check className="size-3.5" /> : active ? <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-foreground border-t-transparent" /> : <span className="size-3.5 rounded-full border-[1.5px] border-border" />}
                    {s.done ? <span className="text-muted-foreground">{s.label}</span> : active ? <TextShimmer className="text-[13px]">{s.label}</TextShimmer> : <span className="text-subtle">{s.label}</span>}
                  </StepsItem>
                )
              })}
            </div>
          </StepsContent>
        </Steps>
      </Assistant>
    )
  }
  if (m.kind === 'flag') return <Assistant compact={compact}><FlagMessage flag={m.flag} simId={simId} /></Assistant>
  if (m.kind === 'tool') return <Assistant compact={compact}><ToolRow label={m.label} /></Assistant>
  if (m.kind === 'question')
    return (
      <Assistant compact={compact}>
        <p className={cn('leading-[22px]', compact ? 'text-[13px]' : 'text-sm')}>{m.text}</p>
        <div className="flex flex-wrap gap-2">
          {m.options.map((o) => {
            const picked = m.answered === o.id
            return (
              <button
                key={o.id}
                disabled={!!m.answered && o.id !== 'sources'}
                onClick={() => void answerQuestion(simId, m.id, o.id)}
                className={cn('rounded-lg border px-3 py-2 text-left text-[13px] transition-colors', o.primary && !m.answered ? 'border-foreground' : '', picked ? 'border-foreground bg-accent' : 'hover:bg-accent', m.answered && !picked && 'opacity-50', o.id === 'sources' && 'border-transparent text-muted-foreground')}
              >
                <span className={cn('font-medium', o.sub && 'num')}>{o.label}</span>
                {o.sub && <span className="ml-2 text-xs text-muted-foreground">{o.sub}</span>}
              </button>
            )
          })}
        </div>
      </Assistant>
    )
  if (m.kind === 'result')
    return (
      <Assistant compact={compact}>
        <ResultCard simId={simId} version={m.version} compact={compact} />
      </Assistant>
    )
  if (m.kind === 'change')
    return (
      <Assistant compact={compact}>
        <div className="rounded-[10px] border bg-card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Proposed change</span>
            <Pill>{m.status === 'staged' ? 'Staged' : m.status === 'applied' ? `Applied · v${m.appliedVersion}` : 'Dismissed'}</Pill>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span>{m.label}</span>
            <span className="flex-1" />
            <span className="num text-muted-foreground line-through">{m.before}</span>
            <span className="text-muted-foreground">→</span>
            <span className="num font-semibold">{m.after}</span>
          </div>
          {m.previews.length > 0 && (
            <div className="mt-2 space-y-1 border-t pt-2">
              {m.previews.map((p) => (
                <div key={p.label} className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{p.label} (preview)</span><span className="num font-medium">{p.before} → {p.after}</span></div>
              ))}
            </div>
          )}
          {m.status === 'staged' && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void applyChange(simId, m.id)}>Apply &amp; re-run</Button>
              <Button size="sm" variant="ghost" onClick={() => dismissChange(simId, m.id)}>Dismiss</Button>
            </div>
          )}
        </div>
      </Assistant>
    )
  if (m.kind === 'suggest')
    return (
      <div className="flex flex-wrap gap-2 pl-9">
        {m.items.map((i) => (
          <PromptSuggestion key={i} onClick={() => send(i)} className="h-auto rounded-lg py-1.5 text-[13px]">{i}</PromptSuggestion>
        ))}
      </div>
    )
  return null
}

function FlagMessage({ flag, simId }: { flag: Flag; simId: string }) {
  const nav = useNavigate()
  const variant = flag.severity === 'error' ? 'error' : flag.severity === 'warning' ? 'warning' : 'action'
  return (
    <SystemMessage variant={variant} fill className="items-start">
      <div>
        <div className="font-medium">{flag.title}</div>
        {flag.detail && <div className="mt-0.5 text-xs opacity-80">{flag.detail}</div>}
      </div>
      {flag.action && flag.action.kind !== 'answer' && (
        <button className="ml-3 shrink-0 text-xs font-medium underline underline-offset-2" onClick={() => openFlagTarget(flag, simId, nav)}>{flag.action.label}</button>
      )}
    </SystemMessage>
  )
}

export function Composer({ simId, placeholder, onSend, disabled, compact, autoFocus }: { simId: string | null; placeholder: string; onSend?: (t: string) => Promise<string | void> | void; disabled?: boolean; compact?: boolean; autoFocus?: boolean }) {
  const [v, setV] = useState('')
  const nav = useNavigate()
  const setUI = useApp((s) => s.setUI)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (autoFocus) ref.current?.querySelector('textarea')?.focus() }, [autoFocus])
  const submit = async () => {
    const t = v.trim()
    if (!t || disabled) return
    setV('')
    if (onSend) { await onSend(t); return }
    const id = await handleMessage(simId, t)
    if (!simId && id) nav(`/s/${id}`)
  }
  return (
    <div ref={ref}>
      <PromptInput value={v} onValueChange={setV} onSubmit={submit} disabled={disabled} className={cn('rounded-2xl border bg-card shadow-none', compact ? 'p-2' : 'p-3')}>
        <PromptInputTextarea placeholder={placeholder} className={cn('placeholder:text-subtle', compact ? 'min-h-[36px] text-[13px]' : 'min-h-[44px] text-[15px]')} />
        <PromptInputActions className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <PromptInputAction tooltip="Attach a file"><Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground" onClick={() => nav('/uploads')}><Paperclip className="size-3.5" />{!compact && 'Attach'}</Button></PromptInputAction>
            <PromptInputAction tooltip="Configure run (⌘⇧R)"><Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground" onClick={() => setUI({ runFormOpen: true })}><Settings2 className="size-3.5" />{!compact && 'Configure run'}</Button></PromptInputAction>
          </div>
          <div className="flex items-center gap-2">
            {!compact && <span className="hidden text-[11px] text-subtle sm:block">⌘⏎</span>}
            <PromptInputAction tooltip="Send">
              <Button size="icon" className="size-8 rounded-full" disabled={!v.trim() || disabled} onClick={() => void submit()} aria-label="Send"><ArrowUp className="size-4" /></Button>
            </PromptInputAction>
          </div>
        </PromptInputActions>
      </PromptInput>
    </div>
  )
}

export function Thread({ simId, compact, className }: { simId: string; compact?: boolean; className?: string }) {
  const sim = useApp((s) => s.sims[simId])
  const pendingQ = sim?.thread.some((m) => m.kind === 'question' && !m.answered)
  if (!sim) return null
  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <ChatContainerRoot className="min-h-0 flex-1">
        <ChatContainerContent className={cn('mx-auto w-full space-y-5 px-4 py-6', compact ? 'max-w-full' : 'max-w-[760px]')}>
          {sim.thread.map((m) => <Row key={m.id} m={m} simId={simId} compact={compact} />)}
          {sim.busy && !pendingQ && sim.thread[sim.thread.length - 1]?.kind === 'user' && (
            <Assistant compact={compact}><TextShimmer className="text-sm">Thinking…</TextShimmer></Assistant>
          )}
        </ChatContainerContent>
        <div className="pointer-events-none absolute bottom-3 right-4"><ScrollButton className="pointer-events-auto" /></div>
      </ChatContainerRoot>
      <div className={cn('mx-auto w-full px-4 pb-5 pt-1', compact ? 'max-w-full' : 'max-w-[760px]')}>
        <Composer simId={simId} compact={compact} disabled={sim.busy || pendingQ} placeholder={pendingQ ? 'Answer the question above to continue' : 'Ask about this simulation…'} />
      </div>
    </div>
  )
}

export { Sparkles, ChevronDown, f2 }
