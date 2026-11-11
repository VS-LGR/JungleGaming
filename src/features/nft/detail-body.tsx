import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Heart, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { addCartItem, addFavorite, fetchFavorites, fetchNft, removeFavorite } from '@/api/endpoints'
import { readError } from '@/api/client'
import { BackBar, useUnavailable } from '@/components/shell'
import { NftMedia } from '@/components/nft-media'
import { PointerTilt } from '@/components/pointer-tilt'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EditionId } from '@/contracts/types'
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { rememberNftVersion, useSession } from '@/features/session'
import { formatEthLabel } from '@/lib/money'

export function DetailBody() {
  const { nftId } = useParams({ strict: false }) as { nftId: string }
  const search = useSearch({ strict: false }) as { edition: EditionId; qty: number }
  const navigate = useNavigate()
  const unavailable = useUnavailable()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const nft = useQuery({
    queryKey: ['nft', nftId],
    queryFn: async ({ signal }) => {
      const data = await fetchNft(nftId, signal)
      rememberNftVersion(data.id, data.version)
      return data
    },
  })
  const favorites = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled: Boolean(user),
  })
  const favorite = useMutation({
    mutationFn: async (next: boolean) => (next ? addFavorite(nftId) : removeFavorite(nftId)),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })
      const previous = queryClient.getQueryData<string[]>(['favorites', user?.id]) ?? []
      queryClient.setQueryData<string[]>(['favorites', user?.id], next ? [...new Set([...previous, nftId])] : previous.filter((id) => id !== nftId))
      return { previous }
    },
    onError: (error, _next, context) => {
      queryClient.setQueryData(['favorites', user?.id], context?.previous ?? [])
      toast.error(readError(error).message)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
  })
  const add = useMutation({
    mutationFn: () => addCartItem(nftId, search.edition, search.qty),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (error) => toast.error(readError(error).message),
  })
  const item = nft.data
  if (!item) return null
  const edition = item.editions.find((entry) => entry.id === search.edition) ?? item.editions[2]
  const max = edition.remaining === null ? 20 : edition.remaining
  const saved = favorites.data?.includes(item.id) ?? false

  function setEdition(editionId: EditionId) {
    void navigate({ to: '/nfts/$nftId', params: { nftId }, search: { edition: editionId, qty: 1 } })
  }
  function setQty(qty: number) {
    void navigate({ to: '/nfts/$nftId', params: { nftId }, search: { edition: edition.id, qty } })
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <BackBar title={item.name} />
      <p className="mb-4 hidden text-sm text-gold-2 md:block"><Link to="/" search={emptyHomeSearch}>Início</Link> / Mercado</p>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div className="hidden flex-col gap-2 md:flex">
            {item.editions.map((entry) => (
              <button key={entry.id} type="button" className="motion-press overflow-hidden rounded-md" aria-label={`Ver ${item.name}`} onClick={() => setEdition(entry.id)}>
                <NftMedia art={item} />
              </button>
            ))}
          </div>
          <PointerTilt className="overflow-hidden rounded-2xl bg-[#d9d3c3]">
            <NftMedia priority art={item} sizes="(min-width: 768px) 560px, 90vw" />
          </PointerTilt>
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-4xl">{item.name}</h1>
            <button
              type="button"
              className="md:hidden"
              aria-pressed={saved}
              aria-label={saved ? 'Remover dos favoritos' : 'Favoritar'}
              onClick={() => {
                if (!user) {
                  void navigate({ to: '/entrar', search: { redirect: `/nfts/${nftId}` } })
                  return
                }
                favorite.mutate(!saved)
              }}
            >
              <Heart className={saved ? 'fill-amber text-amber' : 'text-cream'} />
            </button>
          </div>
          <p className="mt-2 text-xl font-semibold text-amber">{formatEthLabel(edition.priceEth)}</p>
          <p className="mt-1 text-sm text-gold-2">{item.rating.toFixed(1)} · {item.ratingCount} avaliações de colecionadores</p>
          <p className="mt-4 text-sm leading-6 text-gold-2">{item.description}</p>
          <p className="mt-4 text-sm">Edição:</p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
            {item.editions.map((entry) => (
              <button key={entry.id} type="button" role="radio" aria-checked={entry.id === edition.id} disabled={!entry.available} className={`rounded-full border px-3 py-1 text-xs ${entry.id === edition.id ? 'border-amber text-amber' : 'border-line text-gold-2'} disabled:opacity-40`} onClick={() => setEdition(entry.id)}>
                {entry.label}
              </button>
            ))}
          </div>
          {!edition.available ? <p className="mt-3 text-sm text-amber" role="status">Esta edição está indisponível.</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2" aria-label="Quantidade">
              <button type="button" className="grid size-8 place-items-center rounded-full border border-line" aria-label="Diminuir quantidade" disabled={search.qty <= 1} onClick={() => setQty(search.qty - 1)}><Minus className="size-4" /></button>
              <span key={search.qty} className="motion-pop w-6 text-center" aria-live="polite">{search.qty}</span>
              <button type="button" className="grid size-8 place-items-center rounded-full border border-line" aria-label="Aumentar quantidade" disabled={!edition.available || search.qty >= max} onClick={() => setQty(search.qty + 1)}><Plus className="size-4" /></button>
            </div>
            <p className="text-sm text-gold-2">{max === 0 ? 'Esgotada' : `Até ${max}`}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={!edition.available || add.isPending}
              onClick={() => {
                add.mutate(undefined, {
                  onSuccess: () => void navigate({ to: '/carrinho' }),
                })
              }}
            >
              COMPRAR
            </Button>
            <Button variant="outline" disabled={!edition.available || add.isPending} onClick={() => add.mutate(undefined, { onSuccess: () => toast.success('Adicionado ao carrinho.') })}>
              Adicionar ao carrinho
            </Button>
            <Button
              variant="outline"
              className="hidden md:inline-flex"
              aria-pressed={saved}
              onClick={() => {
                if (!user) {
                  void navigate({ to: '/entrar', search: { redirect: `/nfts/${nftId}` } })
                  return
                }
                favorite.mutate(!saved)
              }}
            >
              <Heart className={`size-4 ${saved ? 'fill-amber' : ''}`} /> {saved ? 'Favorito' : 'Favoritar'}
            </Button>
          </div>
          <dl className="mt-6 space-y-1 text-sm text-gold-2">
            <div className="flex gap-1"><dt>ID do token:</dt><dd>#{item.tokenId}</dd></div>
            <div className="flex gap-1"><dt>Coleção:</dt><dd>{item.collection}</dd></div>
            <div className="flex gap-1"><dt>Atributos:</dt><dd>{item.attributes.join(', ')}</dd></div>
          </dl>
          <button type="button" className="mt-4 text-sm text-amber" onClick={() => unavailable('Compartilhar este NFT')}>Compartilhar este NFT</button>
        </div>
      </div>
      <Tabs defaultValue="detalhes" className="mt-10">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes do NFT</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações de colecionadores ({item.reviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="detalhes" className="max-w-3xl space-y-3 text-sm leading-6 text-gold-2">
          <p>{item.longDescription}</p>
          <p>Rede: cunhado com procedência registrada.</p>
          <p>Contrato: {item.contract}</p>
          <p>Direitos autorais: {item.royalty}</p>
        </TabsContent>
        <TabsContent value="avaliacoes" className="space-y-3">
          {item.reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-line p-4">
              <h2 className="font-semibold">{review.author}</h2>
              <p className="text-sm text-amber">{review.rating} de 5</p>
              <p className="mt-2 text-sm text-gold-2">{review.text}</p>
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
