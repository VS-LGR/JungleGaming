import { expect, test } from '@playwright/test'
import { boot, login } from './helpers'

test('preço ao vivo atualiza o detalhe', async ({ page }) => {
  await boot(page, 'price-changed')
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByText('1.29 ETH').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#live-region')).toContainText(/Emerald Ape/)
})

test('evento duplicado não aplica o preço duas vezes', async ({ page }) => {
  await boot(page, 'duplicate-event')
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByText('1.29 ETH').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(800)
  await expect(page.getByText('1.39 ETH')).toHaveCount(0)
})

test('evento antigo não regride o preço', async ({ page }) => {
  await boot(page, 'stale-event')
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByText('1.29 ETH').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(800)
  await expect(page.getByText('1.19 ETH')).toHaveCount(0)
})

test('edição esgotada chega pelo evento', async ({ page }) => {
  await boot(page, 'edition-sold-out')
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByText('Esta edição está indisponível.')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'COMPRAR', exact: true })).toBeDisabled()
})

test('queda do socket reconcilia o pedido pela API', async ({ page }) => {
  await boot(page, 'drop-socket')
  await login(page)
  await page.goto('/pagamento')
  await page.getByRole('button', { name: 'Conectar', exact: true }).click()
  await expect(page.getByText(/conectada\./i)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByText(/PENDENTE|THANK YOU/)).toBeVisible()
  await expect(page.getByText('THANK YOU')).toBeVisible({ timeout: 20_000 })
})
