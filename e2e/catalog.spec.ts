import { expect, test } from '@playwright/test'
import { boot, openFilters, openHome, searchCatalog } from './helpers'

test.beforeEach(async ({ page }) => {
  await boot(page)
})

test('filtros, ordenação, paginação e histórico ficam na URL', async ({ page }) => {
  await openHome(page)
  await page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: '2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.goBack()
  await expect(page).toHaveURL(/page=1/)

  await searchCatalog(page, 'ape')
  await expect(page).toHaveURL(/q=ape/)
  await expect(page.getByRole('link', { name: /emerald ape #0042/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /sage nomad/i })).toHaveCount(0)

  await page.goto('/')
  await expect(page.getByRole('link', { name: /emerald ape #0042/i })).toBeVisible()
  await openFilters(page)
  await page.getByRole('button', { name: /Música \(\d+\)/ }).click()
  await expect(page).toHaveURL(/category=musica/)
  await expect(page.getByRole('link', { name: /emerald ape/i })).toHaveCount(0)
  await page.getByRole('button', { name: /Polygon \(\d+\)/ }).click()
  await expect(page).toHaveURL(/network=polygon/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('link', { name: /coral note #0201/i })).toBeVisible()

  await page.getByRole('combobox', { name: 'Ordenar por' }).click()
  await page.getByRole('option', { name: 'Menor preço' }).click()
  await expect(page).toHaveURL(/sort=price-asc/)
  await page.reload()
  await expect(page).toHaveURL(/category=musica/)
  await expect(page).toHaveURL(/network=polygon/)
  await expect(page).toHaveURL(/sort=price-asc/)
})

test('detalhe direto, edição esgotada e NFT inexistente', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #0042' }).last()).toBeVisible()
  await expect(page.getByRole('radio', { name: '1/1', exact: true })).toBeDisabled()
  await page.goto('/nfts/emerald-ape-0042?edition=open&qty=51')
  await expect(page.getByLabel('Quantidade').getByText('20')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  await page.goto('/nfts/nao-existe')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('cenário vazio, erro e skeleton', async ({ page }) => {
  await boot(page, 'empty')
  await page.goto('/')
  await expect(page.getByText('Nenhum NFT encontrado com esses filtros.')).toBeVisible()

  await boot(page, 'server-error')
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o catálogo.')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await boot(page, 'slow')
  await page.goto('/')
  await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
  await expect(page.getByRole('link', { name: /emerald ape #0042/i })).toBeVisible()
})
