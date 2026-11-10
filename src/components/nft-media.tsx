import type { ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Art = {
  image: string
  thumb: string
  imageAlt: string
}

export function NftMedia({
  art,
  priority = false,
  className,
  sizes = '(min-width: 1024px) 280px, 45vw',
}: {
  art: Art
  priority?: boolean
  className?: string
  sizes?: string
} & Pick<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'>) {
  return (
    <img
      src={art.thumb}
      srcSet={`${art.thumb} 640w, ${art.image} 960w`}
      sizes={sizes}
      alt={art.imageAlt}
      width={640}
      height={640}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
