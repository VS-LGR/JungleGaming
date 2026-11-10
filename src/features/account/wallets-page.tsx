import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { readError } from '@/api/client'
import { saveWallet } from '@/api/endpoints'
import { fetchWallets } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { networks, walletProviders, type NetworkId, type Wallet, type WalletProviderId } from '@/contracts/types'
import { AccountNav } from '@/features/account/account-nav'
import { useSession } from '@/features/session'

const schema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  nickname: z.string().trim().min(2, 'Informe o apelido.'),
  network: z.enum(['ethereum', 'polygon', 'solana']),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  address: z.string().trim().min(20, 'Endereço inválido.'),
  walletType: z.enum(['metamask', 'walletconnect', 'coinbase']),
  email: z.string().trim().email('E-mail inválido.'),
  ensName: z.string().trim().min(3, 'Informe o nome ENS.'),
  referralCode: z.string().trim().min(3, 'Informe o código de indicação.'),
})

type Values = z.infer<typeof schema>

export function WalletsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const wallets = useQuery({ queryKey: ['wallets', user?.id], queryFn: ({ signal }) => fetchWallets(signal), enabled: Boolean(user) })
  const [same, setSame] = useState(false)
  const [adding, setAdding] = useState(false)
  const primary = useWalletForm(wallets.data?.primary, 'primary')
  const secondary = useWalletForm(wallets.data?.secondary, 'secondary')
  const save = useMutation({
    mutationFn: (input: { role: 'primary' | 'secondary'; values: Values }) => saveWallet(input.role, { ...input.values, sameAsPrimary: input.role === 'secondary' ? same : false }),
    onSuccess: async (_data, variables) => {
      const form = variables.role === 'primary' ? primary.form : secondary.form
      form.reset(variables.values)
      await queryClient.invalidateQueries({ queryKey: ['wallets', user?.id] })
      toast.success('Carteira salva.')
    },
    onError: (error, variables) => {
      const body = readError(error)
      const form = variables.role === 'primary' ? primary.form : secondary.form
      if (body.fields) {
        for (const [field, message] of Object.entries(body.fields)) form.setError(field as keyof Values, { message })
      } else toast.error(body.message)
    },
  })

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 md:grid-cols-[240px_1fr] md:px-8">
      <AccountNav />
      <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Carteira principal</h1>
          </div>
          <p className="mt-1 text-sm text-gold-2">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          <WalletForm form={primary.form} onSubmit={(values) => save.mutate({ role: 'primary', values })} pending={save.isPending} />
        </section>
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Carteira secundária</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={same} onChange={(event) => setSame(event.target.checked)} />
              Igual à carteira principal
            </label>
          </div>
          {wallets.data?.secondary || same || adding ? (
            <WalletForm
              form={secondary.form}
              onSubmit={(values) => save.mutate({ role: 'secondary', values: same && wallets.data?.primary ? { ...values, ...mapWallet(wallets.data.primary) } : values })}
              pending={save.isPending}
            />
          ) : (
            <div className="mt-3">
              <p className="text-sm text-gold-2">Você ainda não adicionou uma carteira secundária.</p>
              <Button className="mt-3" type="button" onClick={() => { secondary.form.reset(primary.form.getValues()); setAdding(true) }}>Adicionar</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function mapWallet(wallet: Wallet): Values {
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    walletType: wallet.walletType,
    email: wallet.email,
    ensName: wallet.ensName,
    referralCode: wallet.referralCode,
  }
}

function emptyWallet(role: 'primary' | 'secondary'): Values {
  return {
    displayName: '',
    nickname: role === 'primary' ? 'Principal' : 'Reserva',
    network: 'ethereum',
    profileName: '',
    address: '',
    walletType: 'metamask',
    email: '',
    ensName: '',
    referralCode: '',
  }
}

function useWalletForm(wallet: Wallet | null | undefined, role: 'primary' | 'secondary') {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyWallet(role) })
  const dirty = form.formState.isDirty
  const signature = wallet ? `${wallet.id}:${wallet.nickname}:${wallet.address}` : ''
  useEffect(() => {
    if (wallet && !dirty) form.reset(mapWallet(wallet))
  }, [dirty, form, signature, wallet])
  return { form }
}

function WalletForm({ form, onSubmit, pending }: { form: ReturnType<typeof useForm<Values>>; onSubmit: (values: Values) => void; pending: boolean }) {
  return (
    <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Nome de exibição" error={form.formState.errors.displayName?.message}><Input {...form.register('displayName')} /></Field>
      <Field label="Apelido da carteira" error={form.formState.errors.nickname?.message}><Input {...form.register('nickname')} /></Field>
      <Field label="Rede" error={form.formState.errors.network?.message}>
        <Select value={form.watch('network')} onValueChange={(value) => form.setValue('network', value as NetworkId)}>
          <SelectTrigger aria-label="Rede"><SelectValue placeholder="Selecione uma rede" /></SelectTrigger>
          <SelectContent>{networks.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Nome do perfil" error={form.formState.errors.profileName?.message}><Input {...form.register('profileName')} /></Field>
      <Field label="Endereço da carteira" error={form.formState.errors.address?.message}><Input placeholder="Endereço 0x da carteira" {...form.register('address')} /></Field>
      <Field label="Tipo de carteira" error={form.formState.errors.walletType?.message}>
        <Select value={form.watch('walletType')} onValueChange={(value) => form.setValue('walletType', value as WalletProviderId)}>
          <SelectTrigger aria-label="Tipo de carteira"><SelectValue placeholder="Selecione uma carteira" /></SelectTrigger>
          <SelectContent>{walletProviders.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field>
      <Field label="Nome ENS" error={form.formState.errors.ensName?.message}><Input {...form.register('ensName')} /></Field>
      <Field label="Código de indicação" error={form.formState.errors.referralCode?.message}><Input {...form.register('referralCode')} /></Field>
      <div className="md:col-span-2"><Button type="submit" disabled={pending}>Salvar carteira</Button></div>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <Label>{label} <span className="text-amber">*</span></Label>
      <div className="mt-1">{children}</div>
      {error ? <p role="alert" className="mt-1 text-xs text-amber">{error}</p> : null}
    </label>
  )
}
