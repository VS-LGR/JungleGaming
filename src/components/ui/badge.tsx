import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-sm bg-amber px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink', className)} {...props} />
}
