import { cn } from '@/lib/utils'

/** The sprout mascot. `large` uses the 512px asset (Home hero); otherwise a 96px one for small spots. */
export function Logo({ className, large }: { className?: string; large?: boolean }) {
  return <img src={large ? '/mascot.png' : '/mascot-sm.png'} alt="Eco Value Simulator" className={cn('size-7 shrink-0 object-contain', className)} draggable={false} />
}
