import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { readError } from '@/api/client'
import { deleteCartItem, fetchQuote, updateCartItem } from '@/api/endpoints'
import { BackBar } from '@/components/shell'
import { NftMedia } from '@/components/nft-media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { useSession } from '@/features/session'
import { formatEthLabel } from '@/lib/money'
import { getGuestId } from '@/lib/storage'

export function CartPage() {
  const { user } = useSession()
  const owner = user?.id ?? getGuestId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState('')
  const quote = useQuery({
    queryKey: ['quote', owner, applied, 'ethereum'],
    queryFn: ({ signal }) => fetchQuote(applied, 'ethereum', signal),
  })
  const change = useMutation({
    mutationFn: (input: { nftId: string; editionId: '1-1' | '1-10' | '1-50' | 'open'; quantity: number }) =>
      updateCartItem(input.nftId, input.editionId, input.quantity),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (error) => toast.error(readError(error).message),
  })
  const remove = useMutation({
    mutationFn: (input: { nftId: string; editionId: '1-1' | '1-10' | '1-50' | 'open' }) => deleteCartItem(input.nftId, input.editionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <BackBar title="Carrinho de NFTs" />
      <p className="mb-6 hidden text-sm text-gold-2 md:block">Início / Mercado / Carrinho</p>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <h1 className="hidden text-2xl font-semibold md:block">Carrinho de NFTs</h1>
          {quote.isLoading ? <CartSkeleton /> : null}
          {quote.isError ? (
            <div role="alert">
              <p>Não foi possível carregar o carrinho.</p>
              <Button className="mt-3" onClick={() => void quote.refetch()}>Tentar novamente</Button>
            </div>
          ) : null}
          {quote.data?.items.length === 0 ? <p className="text-gold-2">Seu carrinho está vazio.</p> : null}
          {quote.data?.items.map((item) => (
            <article key={`${item.nftId}-${item.editionId}`} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl bg-panel p-3">
              <NftMedia art={item} className="aspect-square rounded-lg" />
              <div>
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-xs text-gold-2">Edição: {item.editionLabel} · #{item.tokenId}</p>
                <p className="text-amber">{formatEthLabel(item.lineTotalEth)}</p>
                {item.priceChanged ? <p className="text-xs text-amber">O preço desta edição mudou.</p> : null}
                {!item.available ? <p className="text-xs text-amber">Edição indisponível.</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Diminuir ${item.name}`} onClick={() => change.mutate({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity - 1 })}><Minus className="size-4" /></button>
                <span>{item.quantity}</span>
                <button type="button" aria-label={`Aumentar ${item.name}`} disabled={item.quantity >= item.maxQuantity} onClick={() => change.mutate({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity + 1 })}><Plus className="size-4" /></button>
                <button type="button" aria-label={`Remover ${item.name}`} onClick={() => remove.mutate({ nftId: item.nftId, editionId: item.editionId })}><Trash2 className="size-4" /></button>
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-xl bg-panel p-4" aria-live="polite">
          <h2 className="font-semibold">Resumo da carteira</h2>
          {quote.isLoading ? <Skeleton className="mt-4 h-28" data-testid="summary-skeleton" /> : null}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setApplied(coupon.trim())
            }}
          >
            <Input value={coupon} onChange={(event) => setCoupon(event.target.value)} aria-label="Código promocional" placeholder="Digite o código promocional..." />
            <Button type="submit">Aplicar</Button>
          </form>
          {applied ? (
            <button type="button" className="mt-2 text-xs text-gold" onClick={() => { setApplied(''); setCoupon('') }}>Remover cupom</button>
          ) : null}
          {quote.data?.coupon && !quote.data.coupon.valid ? <p className="mt-2 text-sm text-amber" role="alert">{quote.data.coupon.reason === 'expired' ? 'Cupom expirado.' : 'Cupom inválido.'}</p> : null}
          {quote.data ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEthLabel(quote.data.subtotalEth)}</dd></div>
              <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>(-) {formatEthLabel(quote.data.discountEth)}</dd></div>
              <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEthLabel(quote.data.networkFeeEth)} <span className="block text-xs text-gold">Taxa estimada</span></dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="text-amber">{formatEthLabel(quote.data.totalEth)}</dd></div>
            </dl>
          ) : null}
          {quote.data?.message ? <p className="mt-3 text-sm text-amber">{quote.data.message}</p> : null}
          <Button
            className="mt-4 w-full"
            disabled={!quote.data || quote.data.items.length === 0}
            onClick={() => {
              if (!user) {
                void navigate({ to: '/entrar', search: { redirect: '/pagamento' } })
                return
              }
              void navigate({ to: '/pagamento', search: { coupon: applied } })
            }}
          >
            Conectar e finalizar
          </Button>
          <Link to="/" search={emptyHomeSearch} className="mt-3 block text-center text-sm text-amber">Continuar explorando</Link>
        </aside>
      </div>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div data-testid="cart-skeleton" className="space-y-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}
