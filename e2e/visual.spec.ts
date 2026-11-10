import { expect, test } from '@playwright/test'
import { boot, login } from './helpers'

test.beforeEach(async ({ page }) => {
  await boot(page)
})

test('início', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /emerald ape #0042/i })).toBeVisible()
  await expect(page).toHaveScreenshot('home.png', { fullPage: false })
})

test('detalhe', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #0042' }).last()).toBeVisible()
  await expect(page).toHaveScreenshot('detail.png', { fullPage: false })
})

test('carrinho', async ({ page }) => {
  await login(page)
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Sage Nomad #0009' })).toBeVisible()
  await expect(page.getByText('1.69 ETH').first()).toBeVisible()
  await expect(page).toHaveScreenshot('cart.png', { fullPage: false })
})

test('pagamento', async ({ page }) => {
  await login(page)
  await page.goto('/pagamento')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(page.getByText('Sage Nomad #0009')).toBeVisible()
  await expect(page).toHaveScreenshot('payment.png', { fullPage: false })
})
