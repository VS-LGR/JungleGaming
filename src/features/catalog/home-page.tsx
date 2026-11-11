import { lazy, Suspense, useEffect, useState } from 'react'
import { NftMedia } from '@/components/nft-media'
import { PointerTilt } from '@/components/pointer-tilt'
import { useUnavailable } from '@/components/shell'
import { Button } from '@/components/ui/button'
import type { CategoryId, NetworkId, SortId, TabId } from '@/contracts/types'

const CatalogMarket = lazy(() => import('@/features/catalog/catalog-market').then((module) => ({ default: module.CatalogMarket })))

export const emptyHomeSearch: HomeSearch = { q: '', tab: 'all', sort: 'recent', page: 1 }

export type HomeSearch = {
  q: string
  category?: CategoryId
  network?: NetworkId
  tab: TabId
  sort: SortId
  page: number
  min?: string
  max?: string
}

const slides = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: 'SEJA DONO DO FUTURO DA ARTE DIGITAL',
    text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
  },
  {
    eyebrow: 'Edições verificadas',
    title: 'COLECIONE COM PROCEDÊNCIA CLARA',
    text: 'Cada obra traz edição, rede e preço em ETH. O catálogo responde à busca, aos filtros e à ordenação que ficam na URL.',
  },
  {
    eyebrow: 'Mercado Kurio',
    title: 'DO CATÁLOGO À SUA CARTEIRA',
    text: 'Escolha a edição, revise o carrinho e confirme o pedido em uma simulação com recibo estável.',
  },
]

export function HomePage() {
  const unavailable = useUnavailable()
  const [slide, setSlide] = useState(0)
  const [held, setHeld] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const paused = held || manualPause

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 5600)
    return () => window.clearInterval(timer)
  }, [paused, slide])

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-28 md:px-8">
      <section
        className="grid items-center gap-8 py-8 md:min-h-[calc(100svh-9rem)] md:grid-cols-2 md:py-10"
        aria-roledescription="carrossel"
        aria-label="Destaques"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={(event) => {
          const next = event.relatedTarget
          if (!(next instanceof Node) || !event.currentTarget.contains(next)) setHeld(false)
        }}
      >
        <div>
          <div className="hero-stack">
            {slides.map((item, index) => {
              const active = index === slide
              return (
                <div key={item.title} className="hero-slide flex h-full flex-col" data-active={active} aria-hidden={active ? undefined : true} inert={active ? undefined : true}>
                  <p className="text-sm text-gold-2">{item.eyebrow}</p>
                  {active ? (
                    <h1 className="mt-3 min-h-[3lh] max-w-xl font-display text-4xl leading-none break-words text-cream md:text-5xl lg:min-h-[2lh] lg:text-6xl">{item.title}</h1>
                  ) : (
                    <p className="mt-3 min-h-[3lh] max-w-xl font-display text-4xl leading-none break-words text-cream md:text-5xl lg:min-h-[2lh] lg:text-6xl">{item.title}</p>
                  )}
                  <p className="mt-4 max-w-md flex-1 text-sm leading-6 text-gold-2">{item.text}</p>
                  <Button className="mt-6 self-start" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                    EXPLORAR
                  </Button>
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex gap-1" role="group" aria-label="Destaques">
              {slides.map((item, index) => (
                <button key={item.title} type="button" aria-label={`Destaque ${index + 1}`} aria-current={slide === index ? 'true' : undefined} className="motion-press grid size-6 place-items-center" onClick={() => setSlide(index)}>
                  <span className={`motion-dot size-2 rounded-full ${slide === index ? 'bg-amber' : 'bg-line'}`} />
                </button>
              ))}
            </div>
            <button type="button" className="text-sm text-gold-2" aria-pressed={manualPause} onClick={() => setManualPause((current) => !current)}>
              {manualPause ? 'Continuar destaques' : 'Pausar destaques'}
            </button>
          </div>
        </div>
        <PointerTilt className="overflow-hidden rounded-[28px]">
          <NftMedia
            priority
            art={{ image: '/nfts/emerald-960.webp', thumb: '/nfts/emerald-640.webp', imageAlt: 'Macaco ilustrado com jaqueta verde e óculos redondos' }}
            sizes="(min-width: 768px) 520px, 90vw"
            className="motion-float aspect-square rounded-[28px] bg-[#d9d3c3]"
          />
        </PointerTilt>
      </section>

      <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
        <CatalogMarket />
      </Suspense>

      <section className="scroll-stagger mt-16 grid gap-4 md:mt-24 md:grid-cols-2">
        {[
          ['Lançamentos gênesis de edição limitada', 'Colecione edições escassas diretamente dos criadores antes da revelação pública.'],
          ['Arte digital selecionada e muito mais', 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.'],
        ].map(([title, text]) => (
          <article key={title} className="motion-card grid items-center gap-4 overflow-hidden rounded-xl bg-panel p-4 sm:grid-cols-[140px_1fr]">
            <NftMedia art={{ image: '/nfts/emerald-960.webp', thumb: '/nfts/emerald-640.webp', imageAlt: '' }} className="aspect-square rounded-lg" />
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-gold-2">{text}</p>
              <Button className="mt-4" size="sm" onClick={() => document.getElementById('catalogo')?.scrollIntoView()}>Explorar</Button>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-16 md:mt-24" aria-labelledby="diario-title">
        <h2 id="diario-title" className="text-center font-display text-3xl">Diário da Cunhagem</h2>
        <p className="mt-2 text-center text-sm text-gold-2">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <div className="scroll-stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['12 de setembro', 'Como funciona a propriedade de NFTs'],
            ['13 de setembro', '10 artistas digitais para acompanhar'],
            ['15 de setembro', 'Raridade, atributos e procedência'],
            ['15 de setembro', 'Como proteger sua carteira'],
          ].map(([date, title]) => (
            <article key={title} className="motion-card overflow-hidden rounded-xl bg-panel">
              <NftMedia art={{ image: '/nfts/ivory-960.webp', thumb: '/nfts/ivory-640.webp', imageAlt: '' }} className="aspect-[4/3]" />
              <div className="p-4">
                <p className="text-xs text-gold">{date}</p>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <button type="button" className="mt-3 text-sm text-amber" onClick={() => unavailable(title)}>Ler mais</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
