import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { readError } from '@/api/client'
import { changePassword, removeAvatar, updateAvatar, updateProfile } from '@/api/endpoints'
import { AccountNav } from '@/features/account/account-nav'
import { useSession } from '@/features/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username: z.string().trim().regex(/^[a-z0-9._]{3,20}$/i, 'Use 3 a 20 letras, números, ponto ou _.'),
  email: z.string().trim().email('E-mail inválido.'),
  ensName: z.string().trim().min(3, 'Informe o nome ENS.'),
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira.'),
})

const passwordSchema = z.object({
  current: z.string().min(1, 'Informe a senha atual.'),
  next: z.string().min(8, 'Use 8 caracteres, com letra e número.').regex(/[a-z]/i, 'Inclua uma letra.').regex(/\d/, 'Inclua um número.'),
  confirm: z.string(),
}).refine((value) => value.next === value.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })

export function ProfilePage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: user?.displayName ?? '',
      username: user?.username ?? '',
      email: user?.email ?? '',
      ensName: user?.ensName ?? '',
      walletNickname: user?.walletNickname ?? '',
    },
  })
  const password = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { current: '', next: '', confirm: '' } })
  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Perfil atualizado.')
    },
    onError: (error) => {
      const body = readError(error)
      if (body.fields) {
        for (const [field, message] of Object.entries(body.fields)) form.setError(field as 'email', { message })
      } else toast.error(body.message)
    },
  })
  const pass = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) => changePassword(values.current, values.next),
    onSuccess: () => {
      password.reset()
      toast.success('Senha alterada.')
    },
    onError: (error) => {
      const body = readError(error)
      password.setError('current', { message: body.fields?.current ?? body.message })
      if (body.fields?.next) password.setError('next', { message: body.fields.next })
    },
  })
  const avatar = useMutation({
    mutationFn: async (file: File | null) => {
      if (!file) return removeAvatar()
      const dataUrl = await resizeImage(file)
      return updateAvatar(dataUrl)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Avatar atualizado.')
    },
    onError: (error) => toast.error(readError(error).message),
  })

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 md:grid-cols-[240px_1fr] md:px-8">
      <AccountNav />
      <div>
        <h1 className="text-2xl font-semibold">Perfil do colecionador</h1>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
          <Field label="Nome de exibição" error={form.formState.errors.displayName?.message}><Input {...form.register('displayName')} /></Field>
          <Field label="Nome de usuário" error={form.formState.errors.username?.message}><Input {...form.register('username')} /></Field>
          <Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field>
          <Field label="Nome ENS" error={form.formState.errors.ensName?.message}>
            <div className="flex gap-2"><span className="grid h-12 place-items-center rounded-md border border-line px-3">.eth</span><Input {...form.register('ensName')} /></div>
          </Field>
          <Field label="Apelido da carteira" error={form.formState.errors.walletNickname?.message}><Input {...form.register('walletNickname')} /></Field>
          <div>
            <Label>Avatar</Label>
            <div className="mt-2 flex items-center gap-3">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-12 rounded-full object-cover" /> : <span className="grid size-12 place-items-center rounded-full border border-line text-xs">Foto</span>}
              <label className="cursor-pointer rounded-md bg-amber px-3 py-2 text-sm font-semibold text-ink">
                Alterar
                <input className="sr-only" type="file" accept="image/*" aria-label="Alterar avatar" onChange={(event) => { const file = event.target.files?.[0]; if (file) avatar.mutate(file) }} />
              </label>
              <button type="button" className="text-sm text-gold" onClick={() => avatar.mutate(null)}>Remover</button>
            </div>
          </div>
          <div className="md:col-span-2"><Button type="submit" disabled={save.isPending}>Salvar</Button></div>
        </form>
        <form className="mt-8 max-w-md space-y-3" onSubmit={password.handleSubmit((values) => pass.mutate(values))} noValidate>
          <h2 className="text-lg font-semibold">Alterar senha</h2>
          <Field label="Senha atual" error={password.formState.errors.current?.message}><Input type="password" {...password.register('current')} /></Field>
          <Field label="Nova senha" error={password.formState.errors.next?.message}><Input type="password" {...password.register('next')} /></Field>
          <Field label="Confirmar nova senha" error={password.formState.errors.confirm?.message}><Input type="password" {...password.register('confirm')} /></Field>
          <Button type="submit" disabled={pass.isPending}>Salvar</Button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <Label>{label} <span className="text-amber">*</span></Label>
      <div className="mt-1">{children}</div>
      {error ? <p role="alert" className="mt-1 text-xs text-amber">{error}</p> : null}
    </label>
  )
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('image'))
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('canvas'))
          return
        }
        context.drawImage(image, 0, 0, 128, 128)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
