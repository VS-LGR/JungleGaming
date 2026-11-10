import { expect, type Page } from '@playwright/test'

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 768
}

export async function boot(page: Page, scenario = 'default') {
  await page.addInitScript((name) => {
    const ready = localStorage.getItem('kurio-ready') === '1'
    localStorage.setItem('kurio-scenario', name)
    if (ready) return
    localStorage.setItem('kurio-ready', '1')
    localStorage.removeItem('kurio-db-v1')
    localStorage.removeItem('kurio-token')
    localStorage.removeItem('kurio-guest-id')
    sessionStorage.removeItem('kurio-order-attempt')
  }, scenario)
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

export async function openHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /seja dono do futuro/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /emerald ape #0042/i })).toBeVisible()
}

export async function login(page: Page, email = 'nova@kurio.test', password = 'Kurio#2026') {
  await page.goto(`/entrar?redirect=${encodeURIComponent('/')}`)
  const form = page.locator('form')
  await form.getByLabel('E-mail', { exact: true }).fill(email)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  const first = email.startsWith('ada') ? 'Ada' : 'Nova'
  await expect(page.getByRole('button', { name: first, exact: true })).toBeVisible()
}

export async function searchCatalog(page: Page, query: string) {
  if (isMobile(page)) {
    const field = page.getByLabel('Explorar coleções')
    await field.fill(query)
    await field.press('Enter')
    return
  }
  await page.getByRole('button', { name: 'Buscar coleções' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Buscar coleções').fill(query)
  await dialog.getByRole('button', { name: 'Buscar' }).click()
}

export async function openFilters(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: 'Abrir filtros' }).click()
}

export async function confirmPurchase(page: Page) {
  await page.getByRole('button', { name: 'Conectar', exact: true }).click()
  await expect(page.getByText(/conectada\./i)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByText('THANK YOU')).toBeVisible({ timeout: 20_000 })
}
