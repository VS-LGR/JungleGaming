import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { readError } from '@/api/client'
import { acknowledgeQuote, createOrder, fetchQuote, fetchWallets } from '@/api/endpoints'
import { BackBar } from '@/components/shell'
import { NftMedia } from '@/components/nft-media'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { networks, walletProviders, type NetworkId, type WalletProviderId } from '@/contracts/types'
import { useSession } from '@/features/session'
import { formatEthLabel } from '@/lib/money'
import { onRealtimeReconnect } from '@/realtime/client'

const schema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username: z.string().trim().min(3, 'Informe o nome de usuário.'),
  network: z.enum(['ethereum', 'polygon', 'solana']),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  address: z.string().trim().min(20, 'Informe o endereço da carteira.'),
  secondary: z.string().optional(),
  walletType: z.enum(['metamask', 'walletconnect', 'coinbase']),
  referralCode: z.string().trim().min(3, 'Informe o código de indicação.'),
  email: z.string().trim().email('E-mail inválido.'),
  ensName: z.string().trim().min(3, 'Informe o nome ENS.'),
  observation: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CheckoutPage() {
  const { user } = useSession()
  const search = useSearch({ strict: false }) as { coupon?: string }
  const coupon = search.coupon ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wallets = useQuery({ queryKey: ['wallets', user?.id], queryFn: ({ signal }) => fetchWallets(signal), enabled: Boolean(user) })
  const [walletId, setWalletId] = useState<string>('')
  const [provider, setProvider] = useState<WalletProviderId>('coinbase')
  const [connection, setConnection] = useState<'idle' | 'connecting' | 'connected' | 'refused'>('idle')
  const [accepted, setAccepted] = useState<string | null>(null)
  const network = (wallets.data?.primary?.network ?? wallets.data?.secondary?.network ?? 'ethereum') as NetworkId
  const activeWallet = [wallets.data?.primary, wallets.data?.secondary].find((item) => item?.id === walletId) ?? wallets.data?.primary ?? null
  const quote = useQuery({
    queryKey: ['quote', user?.id, coupon, activeWallet?.network ?? network],
    queryFn: ({ signal }) => fetchQuote(coupon, activeWallet?.network ?? network, signal),
    enabled: Boolean(user),
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      username: user?.username ?? '',
      network: 'ethereum',
      profileName: user?.displayName ?? '',
      address: '',
      secondary: '',
      walletType: 'metamask',
      referralCode: 'KURIO',
      email: user?.email ?? '',
      ensName: user?.ensName ?? '',
      observation: '',
    },
  })

  useEffect(() => {
    const wallet = wallets.data?.primary
    if (!wallet || walletId) return
    setWalletId(wallet.id)
    form.reset({
      displayName: wallet.displayName,
      username: user?.username ?? '',
      network: wallet.network,
      profileName: wallet.profileName,
      address: wallet.address,
      secondary: wallets.data?.secondary?.address ?? '',
      walletType: wallet.walletType,
      referralCode: wallet.referralCode,
      email: wallet.email,
      ensName: wallet.ensName,
      observation: '',
    })
  }, [form, user?.username, walletId, wallets.data])

  useEffect(() => {
    if (quote.data && accepted === null) setAccepted(quote.data.quoteId)
  }, [accepted, quote.data])

  useEffect(() => onRealtimeReconnect(() => void queryClient.invalidateQueries({ queryKey: ['quote'] })), [queryClient])

  const stale = Boolean(quote.data && accepted && quote.data.quoteId !== accepted)
  const order = useMutation({
    mutationFn: (values: FormValues) =>
      createOrder({
        quoteId: quote.data?.quoteId ?? '',
        provider,
        walletId,
        network: values.network,
        observation: values.observation ?? '',
        coupon,
        connection: 'connected',
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void navigate({ to: '/pedidos/$orderId', params: { orderId: created.id } })
    },
    onError: async (error) => {
      const body = readError(error)
      if (body.code === 'quote_stale') {
        await queryClient.invalidateQueries({ queryKey: ['quote'] })
        setAccepted('stale')
        toast.message(body.message)
        return
      }
      toast.error(body.message)
    },
  })

  if (!wallets.data?.primary && !wallets.isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Cadastre uma carteira</h1>
        <p className="mt-2 text-gold-2">O pagamento usa uma carteira da sua conta.</p>
        <Button className="mt-4" onClick={() => void navigate({ to: '/conta/carteiras' })}>Ir para carteiras</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <BackBar title="Pagamento com carteira" />
      <p className="mb-4 hidden text-sm text-gold-2 md:block">Início / Mercado / Pagamento</p>
      <form className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" onSubmit={form.handleSubmit((values) => order.mutate(values))} noValidate>
        <section>
          <h1 className="text-xl font-semibold">Perfil do colecionador</h1>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nome de exibição" error={form.formState.errors.displayName?.message} required>
              <Input aria-invalid={Boolean(form.formState.errors.displayName)} {...form.register('displayName')} />
            </Field>
            <Field label="Nome de usuário" error={form.formState.errors.username?.message} required>
              <Input aria-invalid={Boolean(form.formState.errors.username)} {...form.register('username')} />
            </Field>
            <Field label="Rede" error={form.formState.errors.network?.message} required>
              <Select value={form.watch('network')} onValueChange={(value) => form.setValue('network', value as NetworkId, { shouldValidate: true })}>
                <SelectTrigger aria-label="Rede"><SelectValue placeholder="Selecione uma rede" /></SelectTrigger>
                <SelectContent>{networks.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Nome do perfil" error={form.formState.errors.profileName?.message} required>
              <Input {...form.register('profileName')} />
            </Field>
            <Field label="Endereço da carteira" error={form.formState.errors.address?.message} required>
              <Input placeholder="Endereço 0x da carteira" {...form.register('address')} />
            </Field>
            <Field label="ENS ou carteira secundária (opcional)">
              <Input {...form.register('secondary')} />
            </Field>
            <Field label="Tipo de carteira" error={form.formState.errors.walletType?.message} required>
              <Select value={form.watch('walletType')} onValueChange={(value) => form.setValue('walletType', value as WalletProviderId)}>
                <SelectTrigger aria-label="Tipo de carteira"><SelectValue placeholder="Selecione uma carteira" /></SelectTrigger>
                <SelectContent>{walletProviders.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Código de indicação" error={form.formState.errors.referralCode?.message} required>
              <Input {...form.register('referralCode')} />
            </Field>
            <Field label="E-mail" error={form.formState.errors.email?.message} required>
              <Input type="email" {...form.register('email')} />
            </Field>
            <Field label="Nome ENS" error={form.formState.errors.ensName?.message} required>
              <div className="flex gap-2">
                <span className="grid h-12 place-items-center rounded-md border border-line px-3 text-sm">.eth</span>
                <Input {...form.register('ensName')} />
              </div>
            </Field>
          </div>
          <Field label="Observação do colecionador (opcional)">
            <Textarea className="mt-2" {...form.register('observation')} />
          </Field>
        </section>
        <aside className="h-fit rounded-xl bg-panel p-4">
          <h2 className="font-semibold">Seus NFTs</h2>
          {quote.isLoading ? <Skeleton className="mt-4 h-28" data-testid="summary-skeleton" /> : null}
          <ul className="mt-3 space-y-3">
            {quote.data?.items.map((item) => (
              <li key={`${item.nftId}-${item.editionId}`} className="grid grid-cols-[48px_1fr_auto] gap-2 text-sm">
                <NftMedia art={item} className="aspect-square rounded-md" />
                <span>{item.name}<span className="block text-xs text-gold-2">#{item.tokenId}</span></span>
                <span className="text-amber">{formatEthLabel(item.lineTotalEth)}</span>
              </li>
            ))}
          </ul>
          {quote.data ? (
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEthLabel(quote.data.subtotalEth)}</dd></div>
              <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>(-) {formatEthLabel(quote.data.discountEth)}</dd></div>
              <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEthLabel(quote.data.networkFeeEth)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="text-amber">{formatEthLabel(quote.data.totalEth)}</dd></div>
            </dl>
          ) : null}
          {stale || quote.data?.stale ? (
            <div className="mt-3 rounded-md border border-amber p-3 text-sm" role="status">
              <p>{quote.data?.message ?? 'A cotação mudou.'}</p>
              <Button
                type="button"
                className="mt-2"
                size="sm"
                onClick={async () => {
                  const next = await acknowledgeQuote(coupon, activeWallet?.network ?? form.getValues('network'))
                  setAccepted(next.quoteId)
                  await queryClient.invalidateQueries({ queryKey: ['quote'] })
                }}
              >
                Aceitar nova cotação
              </Button>
            </div>
          ) : null}
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Carteira e rede</legend>
            <RadioGroup value={provider} onValueChange={(value) => { setProvider(value as WalletProviderId); setConnection('idle') }} className="mt-2 space-y-2">
              {walletProviders.map((item) => (
                <label key={item.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <RadioGroupItem value={item.id} />
                  {item.label}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setConnection('connecting'); window.setTimeout(() => setConnection('connected'), 250) }}>Conectar</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConnection('refused')}>Simular recusa</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConnection('idle')}>Desconectar</Button>
          </div>
          <p className="mt-2 text-sm" role="status">
            {connection === 'connected' ? `${provider} conectada.` : connection === 'refused' ? 'A carteira recusou a conexão.' : connection === 'connecting' ? 'Conectando...' : 'Carteira desconectada.'}
          </p>
          <Button className="mt-4 w-full" type="submit" disabled={order.isPending || connection !== 'connected' || stale || quote.data?.blocked}>
            {order.isPending ? 'Enviando...' : 'Confirmar compra'}
          </Button>
        </aside>
      </form>
    </div>
  )
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <Label>
        {label}
        {required ? <span className="text-amber"> *</span> : null}
      </Label>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-amber" role="alert">{error}</p> : null}
    </label>
  )
}
