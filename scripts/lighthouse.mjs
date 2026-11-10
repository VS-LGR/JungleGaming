import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const lighthouse = (await import('lighthouse')).default
const chromeLauncher = await import('chrome-launcher')
const outDir = join(root, 'reports', 'lighthouse')
mkdirSync(outDir, { recursive: true })

const pages = [
  { id: 'home', path: '/' },
  { id: 'detail', path: '/nfts/emerald-ape-0042' },
].filter((page) => !process.env.LH_PAGES || process.env.LH_PAGES.split(',').includes(page.id))
const runs = Number(process.env.LH_RUNS ?? 3)
const profiles = [
  {
    id: 'mobile',
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
  },
  {
    id: 'desktop',
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
  },
].filter((profile) => !process.env.LH_PROFILES || process.env.LH_PROFILES.split(',').includes(profile.id))

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
const base = process.env.LH_URL ?? 'http://127.0.0.1:4173'
const summary = []

try {
  for (const page of pages) {
    for (const profile of profiles) {
      const scores = []
      for (let run = 1; run <= runs; run += 1) {
        const result = await lighthouse(`${base}${page.path}`, {
          port: chrome.port,
          output: ['html', 'json'],
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          formFactor: profile.formFactor,
          screenEmulation: profile.screenEmulation,
          throttlingMethod: 'devtools',
          throttling: profile.id === 'desktop'
            ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 }
            : { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
        })
        const lhr = result.lhr
        const file = `${page.id}-${profile.id}-run${run}`
        writeFileSync(join(outDir, `${file}.json`), result.report[1])
        writeFileSync(join(outDir, `${file}.html`), result.report[0])
        scores.push({
          performance: Math.round(lhr.categories.performance.score * 100),
          accessibility: Math.round(lhr.categories.accessibility.score * 100),
          bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
          seo: Math.round(lhr.categories.seo.score * 100),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        })
      }
      const median = (key) => {
        const values = scores.map((item) => item[key]).sort((a, b) => a - b)
        return values[Math.floor((values.length - 1) / 2)]
      }
      summary.push({
        page: page.id,
        profile: profile.id,
        performance: median('performance'),
        accessibility: median('accessibility'),
        bestPractices: median('bestPractices'),
        seo: median('seo'),
        lcp: Math.round(median('lcp')),
        cls: Number(median('cls').toFixed(3)),
        tbt: Math.round(median('tbt')),
      })
    }
  }
} finally {
  await chrome.kill()
}

const meta = {
  date: new Date().toISOString(),
  url: base,
  node: process.version,
  lighthouse: require(join(root, 'node_modules', 'lighthouse', 'package.json')).version,
  targets: { performance: 90, accessibility: 95, bestPractices: 95, seo: 90 },
  summary,
}
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(meta, null, 2))
console.log(JSON.stringify(summary, null, 2))
