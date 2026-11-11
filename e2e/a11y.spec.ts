import { expect, test } from '@playwright/test'
import { boot, login } from './helpers'

test('teclado, diálogo preso e rótulos de formulário', async ({ page }) => {
  await boot(page)
  await page.goto('/entrar')
  await page.getByRole('button', { name: 'Continuar com Google' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('não faz parte desta versão')
  await page.keyboard.press('Tab')
  await expect(dialog).toBeFocused({ timeout: 1000 }).catch(async () => {
    const owner = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)
    expect(owner).toBe(true)
  })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  const form = page.locator('form')
  await form.getByLabel('E-mail', { exact: true }).fill('nao-e-email')
  await form.getByLabel('Senha', { exact: true }).fill('')
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(form.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')
})

test('768 px e zoom de 200% não criam overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'A largura de 768 é medida uma vez, no projeto desktop.')
  await boot(page)
  await login(page)
  const routes = ['/', '/nfts/emerald-ape-0042', '/carrinho', '/pagamento']
  for (const width of [768, 720]) {
    await page.setViewportSize({ width, height: 1024 })
    for (const route of routes) {
      await page.goto(route)
      await expect(page.locator('main, body').first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${route} em ${width}px`).toBeLessThanOrEqual(1)
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  const zoomed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(zoomed).toBeLessThanOrEqual(1)
})

test('artes têm texto alternativo', async ({ page }) => {
  await boot(page)
  await page.goto('/')
  await expect(page.getByRole('img', { name: /jaqueta verde/i })).toBeVisible()
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByRole('img', { name: /Emerald Ape/i }).first()).toBeVisible()
})
