import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { readError } from '@/api/client'
import { login, register } from '@/api/endpoints'
import { useUnavailable } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setToken } from '@/lib/storage'
import { refreshRealtime } from '@/realtime/client'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
})

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Informe o nome de usuário.'),
  email: z.string().trim().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.'),
  confirm: z.string().min(1, 'Confirme a senha.'),
}).refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [tab, setTab] = useState(mode)
  const search = useSearch({ strict: false }) as { redirect?: string }
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const unavailable = useUnavailable()
  const redirect = search.redirect?.startsWith('/') ? search.redirect : '/'
  const loginForm = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const registerForm = useForm({ resolver: zodResolver(registerSchema), defaultValues: { username: '', email: '', password: '', confirm: '' } })
  const signIn = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) => login(values.email, values.password),
    onSuccess: async (session) => {
      setToken(session.token, session.expiresAt)
      await queryClient.invalidateQueries()
      await refreshRealtime(queryClient)
      void navigate({ href: redirect })
    },
    onError: (error) => loginForm.setError('password', { message: readError(error).message }),
  })
  const signUp = useMutation({
    mutationFn: (values: z.infer<typeof registerSchema>) => register({ email: values.email, username: values.username, password: values.password, displayName: values.username }),
    onSuccess: async (session) => {
      setToken(session.token, session.expiresAt)
      await queryClient.invalidateQueries()
      await refreshRealtime(queryClient)
      void navigate({ href: redirect })
    },
    onError: (error) => {
      const body = readError(error)
      if (body.fields) {
        for (const [field, message] of Object.entries(body.fields)) {
          registerForm.setError(field as 'email' | 'username' | 'password', { message })
        }
      } else registerForm.setError('email', { message: body.message })
    },
  })

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <p className="text-center font-display text-3xl tracking-[0.2em]">KURIO</p>
      <div className="mt-8 text-center">
        <button type="button" className={tab === 'login' ? 'font-semibold' : 'text-gold'} onClick={() => setTab('login')}>Entrar</button>
        <span className="px-2 text-gold">|</span>
        <button type="button" className={tab === 'register' ? 'font-semibold' : 'text-gold'} onClick={() => setTab('register')}>Criar conta</button>
      </div>
      {tab === 'login' ? (
        <form className="mt-6 space-y-3" onSubmit={loginForm.handleSubmit((values) => signIn.mutate(values))} noValidate>
          <p className="text-center text-sm text-gold-2">Entre para gerenciar sua carteira, coleção e perfil de criador.</p>
          <Input type="email" placeholder="contato@email.com" aria-label="E-mail" aria-invalid={Boolean(loginForm.formState.errors.email)} {...loginForm.register('email')} />
          {loginForm.formState.errors.email ? <p className="text-xs text-amber" role="alert">{loginForm.formState.errors.email.message}</p> : null}
          <Input type="password" placeholder="Senha" aria-label="Senha" aria-invalid={Boolean(loginForm.formState.errors.password)} {...loginForm.register('password')} />
          {loginForm.formState.errors.password ? <p className="text-xs text-amber" role="alert">{loginForm.formState.errors.password.message}</p> : null}
          <div className="text-right">
            <button type="button" className="text-sm text-gold" onClick={() => unavailable('Recuperação de senha')}>Esqueceu a senha?</button>
          </div>
          <Button className="w-full" type="submit" disabled={signIn.isPending}>Entrar</Button>
        </form>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={registerForm.handleSubmit((values) => signUp.mutate(values))} noValidate>
          <p className="text-center text-sm text-gold-2">Crie seu perfil de colecionador e conecte uma carteira quando quiser.</p>
          <Input placeholder="Nome de usuário" aria-label="Nome de usuário" aria-invalid={Boolean(registerForm.formState.errors.username)} {...registerForm.register('username')} />
          {registerForm.formState.errors.username ? <p className="text-xs text-amber" role="alert">{registerForm.formState.errors.username.message}</p> : null}
          <Input type="email" placeholder="Digite seu e-mail" aria-label="E-mail" aria-invalid={Boolean(registerForm.formState.errors.email)} {...registerForm.register('email')} />
          {registerForm.formState.errors.email ? <p className="text-xs text-amber" role="alert">{registerForm.formState.errors.email.message}</p> : null}
          <Input type="password" placeholder="Senha" aria-label="Senha" aria-invalid={Boolean(registerForm.formState.errors.password)} {...registerForm.register('password')} />
          {registerForm.formState.errors.password ? <p className="text-xs text-amber" role="alert">{registerForm.formState.errors.password.message}</p> : null}
          <Input type="password" placeholder="Confirmar senha" aria-label="Confirmar senha" aria-invalid={Boolean(registerForm.formState.errors.confirm)} {...registerForm.register('confirm')} />
          {registerForm.formState.errors.confirm ? <p className="text-xs text-amber" role="alert">{registerForm.formState.errors.confirm.message}</p> : null}
          <Button className="w-full" type="submit" disabled={signUp.isPending}>Criar perfil</Button>
        </form>
      )}
      <p className="my-4 text-center text-sm text-gold">Ou continue com</p>
      <div className="space-y-2">
        <Button type="button" variant="outline" className="w-full" onClick={() => unavailable('Continuar com Google')}>Continuar com Google</Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => unavailable('Continuar com Facebook')}>Continuar com Facebook</Button>
      </div>
      <p className="mt-6 text-center text-sm text-gold-2">
        {tab === 'login' ? <Link to="/cadastro" search={{ redirect }} className="text-amber">Novo na Kurio? Crie uma conta</Link> : <Link to="/entrar" search={{ redirect }} className="text-amber">Já tem uma conta? Entre</Link>}
      </p>
    </div>
  )
}
