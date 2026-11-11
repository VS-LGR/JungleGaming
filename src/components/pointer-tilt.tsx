import { useRef, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PointerTilt({
  children,
  className,
  max = 7,
}: {
  children: ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  function move(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      leave()
      return
    }
    const box = node.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    node.dataset.tilt = 'on'
    node.style.setProperty('--tilt-x', `${(x * max).toFixed(2)}deg`)
    node.style.setProperty('--tilt-y', `${(-y * max).toFixed(2)}deg`)
  }

  function leave() {
    const node = ref.current
    if (!node) return
    delete node.dataset.tilt
    node.style.removeProperty('--tilt-x')
    node.style.removeProperty('--tilt-y')
  }

  return (
    <div ref={ref} className={cn('pointer-tilt', className)} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  )
}
