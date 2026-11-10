import { setupWorker } from 'msw/browser'
import { handlers } from '@/mocks/handlers'
import { realtimeHandler } from '@/mocks/socket'

export const worker = setupWorker(...handlers, realtimeHandler)
