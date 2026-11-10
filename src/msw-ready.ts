export const mswReady = (async () => {
  if (import.meta.env.VITE_ENABLE_MSW === 'false') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
})()
