import { expect, test } from '@playwright/test'
import { boot } from './helpers'

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

test('artes têm texto alternativo', async ({ page }) => {
  await boot(page)
  await page.goto('/')
  await expect(page.getByRole('img', { name: /jaqueta verde/i })).toBeVisible()
  await page.goto('/nfts/emerald-ape-0042')
  await expect(page.getByRole('img', { name: /Emerald Ape/i }).first()).toBeVisible()
})
