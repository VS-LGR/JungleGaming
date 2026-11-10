import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-md border border-line bg-transparent px-3 text-sm text-cream placeholder:text-gold/80 focus-visible:border-amber',
        className,
      )}
      {...props}
    />
  )
}
