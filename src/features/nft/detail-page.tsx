import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { fetchNft } from '@/api/endpoints'
import { readError } from '@/api/client'
import { NftMedia } from '@/components/nft-media'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { EditionId } from '@/contracts/types'
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { coverFor } from '@/features/nft/covers'
import { rememberNftVersion } from '@/features/session'
import { cachePolicy } from '@/lib/cache-policy'

const DetailBody = lazy(() => import('@/features/nft/detail-body').then((module) => ({ default: module.DetailBody })))

export type DetailSearch = { edition: EditionId; qty: number }

export function DetailPage() {
  const { nftId } = useParams({ strict: false }) as { nftId: string }
  const nft = useQuery({
    queryKey: ['nft', nftId],
    queryFn: async ({ signal }) => {
      const data = await fetchNft(nftId, signal)
      rememberNftVersion(data.id, data.version)
      return data
    },
    staleTime: cachePolicy.detail.staleTime,
    retry: (count, error) => readError(error).code !== 'not_found' && count < 2,
  })

  if (nft.isLoading || !nft.data) {
    if (nft.isError) {
      const missing = readError(nft.error).code === 'not_found'
      return (
        <div className="mx-auto max-w-xl px-4 py-16" role="alert">
          <h1 className="font-display text-4xl">{missing ? 'NFT não encontrado' : 'Não foi possível abrir o NFT'}</h1>
          <p className="mt-3 text-gold-2">{missing ? 'Esse identificador não existe no catálogo.' : 'Tente carregar de novo.'}</p>
          {missing ? <Button className="mt-6" asChild><Link to="/" search={emptyHomeSearch}>Voltar ao início</Link></Button> : <Button className="mt-6" onClick={() => void nft.refetch()}>Tentar novamente</Button>}
        </div>
      )
    }
    return <Cover nftId={nftId} />
  }

  return (
    <Suspense fallback={<Cover nftId={nftId} />}>
      <DetailBody />
    </Suspense>
  )
}

function Cover({ nftId }: { nftId: string }) {
  const cover = coverFor(nftId)
  return (
    <div className="mx-auto grid min-h-[100svh] max-w-[1200px] gap-6 px-4 py-8 md:grid-cols-2 md:px-8" data-testid="detail-skeleton">
      {cover ? <NftMedia priority art={cover} sizes="(min-width: 768px) 560px, 90vw" className="aspect-square rounded-2xl" /> : <Skeleton className="aspect-square" />}
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
