import axios from 'axios'
import type { ApiErrorBody, Quote } from '@/contracts/types'
import { cachePolicy } from '@/lib/cache-policy'
import { mswReady } from '@/msw-ready'
import { getGuestId, getToken, sessionExpiredLocally, setToken } from '@/lib/storage'

export type ApiFailure = ApiErrorBody & { error: ApiErrorBody['error'] & { quote?: Quote } }

export const api = axios.create({
  baseURL: '/api',
  timeout: cachePolicy.requestTimeoutMs,
})

api.interceptors.request.use(async (config) => {
  await mswReady
  const token = getToken()
  if (token && sessionExpiredLocally()) {
    setToken(null)
    window.dispatchEvent(new CustomEvent('kurio-unauthorized'))
    throw new axios.CanceledError('session-expired')
  }
  config.headers.set('X-Guest-Id', getGuestId())
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register')
      if (!isAuthAttempt && getToken()) {
        setToken(null)
        window.dispatchEvent(new CustomEvent('kurio-unauthorized'))
      }
    }
    return Promise.reject(error)
  },
)

export function readError(error: unknown) {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.error ?? { code: error.code ?? 'network', message: 'Não foi possível concluir a operação.' }
  }
  return { code: 'network', message: 'Não foi possível concluir a operação.' }
}

export function isTimeout(error: unknown) {
  return axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')
}
