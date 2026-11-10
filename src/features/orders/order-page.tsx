import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { fetchOrder } from '@/api/endpoints'
import { NftMedia } from '@/components/nft-media'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { emptyHomeSearch } from '@/features/catalog/home-page'
import { useSession } from '@/features/session'
import { formatEthLabel } from '@/lib/money'
import { noteVersion, onRealtimeReconnect } from '@/realtime/client'

export function OrderPage() {
  const { orderId } = useParams({ strict: false }) as { orderId: string }
  const { user } = useSession()
  const queryClient = useQueryClient()
  const order = useQuery({
    queryKey: ['order', user?.id, orderId],
    queryFn: async ({ signal }) => {
      const data = await fetchOrder(orderId, signal)
      noteVersion(data.id, data.version)
      return data
    },
    enabled: Boolean(user),
  })
  useEffect(() => onRealtimeReconnect(() => void queryClient.invalidateQueries({ queryKey: ['order', user?.id, orderId] })), [orderId, queryClient, user?.id])

  if (order.isLoading) return <div className="mx-auto max-w-xl px-4 py-10"><Skeleton className="h-80" /></div>
  if (order.isError || !order.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16" role="alert">
        <h1 className="text-2xl font-semibold">Pedido não encontrado</h1>
        <Button className="mt-4" asChild><Link to="/" search={emptyHomeSearch}>Voltar ao início</Link></Button>
      </div>
    )
  }
  const data = order.data
  const confirmed = data.status === 'confirmed'
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <article className="rounded-xl border border-line bg-panel p-6">
        <p className="text-center text-xs tracking-[0.2em] text-amber">{confirmed ? 'THANK YOU' : data.status === 'refused' ? 'RECUSADO' : 'PENDENTE'}</p>
        <h1 className="mt-3 text-center text-xl font-semibold">
          {confirmed ? 'Seus NFTs agora estão na sua carteira' : data.status === 'refused' ? 'O pagamento foi recusado' : 'Aguardando confirmação da rede'}
        </h1>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-gold-2">
          <div><dt>ID da transação</dt><dd className="text-cream">{data.transactionRef}</dd></div>
          <div><dt>Data</dt><dd className="text-cream">{new Date(data.createdAt).toLocaleDateString('pt-BR')}</dd></div>
          <div><dt>Total</dt><dd className="text-amber">{formatEthLabel(data.totalEth)}</dd></div>
          <div><dt>Carteira</dt><dd className="text-cream">{data.walletLabel}</dd></div>
        </dl>
        <h2 className="mt-6 text-sm font-semibold">Detalhes da transação</h2>
        <ul className="mt-3 space-y-3">
          {data.items.map((item) => (
            <li key={`${item.nftId}-${item.editionId}`} className="grid grid-cols-[48px_1fr_auto] gap-2 text-sm">
              <NftMedia art={item} className="aspect-square rounded-md" />
              <span>{item.name}<span className="block text-xs text-gold-2">ID do token: #{item.tokenId} · x{item.quantity}</span></span>
              <span className="text-amber">{formatEthLabel(item.lineTotalEth)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between text-sm"><span>Taxa de rede</span><span>{formatEthLabel(data.networkFeeEth)}</span></p>
        <p className="mt-1 flex justify-between font-semibold"><span>Total</span><span className="text-amber">{formatEthLabel(data.totalEth)}</span></p>
        <p className="mt-4 text-center text-sm text-gold-2">
          {confirmed
            ? `Transação confirmada na ${data.networkLabel}. A propriedade foi transferida para a carteira conectada e registrada na rede.`
            : data.status === 'refused'
              ? 'Nenhum item foi retirado do carrinho.'
              : 'O pedido continua pendente. Você pode atualizar a página sem criar outra compra.'}
        </p>
        {confirmed ? (
          <div className="mt-4 text-center">
            <Button asChild><Link to="/explorador/$tx" params={{ tx: data.transactionRef }}>Ver no Etherscan</Link></Button>
          </div>
        ) : null}
      </article>
    </div>
  )
}
