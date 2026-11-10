import * as SliderPrimitive from '@radix-ui/react-slider'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn('relative flex w-full touch-none items-center select-none', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-amber" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-amber bg-amber" aria-label="Preço mínimo" />
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-amber bg-amber" aria-label="Preço máximo" />
    </SliderPrimitive.Root>
  )
}
