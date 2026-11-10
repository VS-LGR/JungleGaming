import { lazy, Suspense, useState } from 'react'
import { NftMedia } from '@/components/nft-media'
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
  const current = slides[slide]

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-28 md:px-8">
      <section className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-14">
        <div>
          <p className="text-sm text-gold-2">{current.eyebrow}</p>
          <h1 className="mt-3 max-w-xl font-display text-4xl leading-none text-cream md:text-6xl">{current.title}</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-gold-2">{current.text}</p>
          <Button className="mt-6" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
            EXPLORAR
          </Button>
          <div className="mt-6 flex gap-1" role="group" aria-label="Destaques">
            {slides.map((item, index) => (
              <button key={item.title} type="button" aria-label={`Destaque ${index + 1}`} aria-current={slide === index ? 'true' : undefined} className="grid size-6 place-items-center" onClick={() => setSlide(index)}>
                <span className={`size-2 rounded-full ${slide === index ? 'bg-amber' : 'bg-line'}`} />
              </button>
            ))}
          </div>
        </div>
        <NftMedia
          priority
          art={{ image: '/nfts/emerald-960.webp', thumb: '/nfts/emerald-640.webp', imageAlt: 'Macaco ilustrado com jaqueta verde e óculos redondos' }}
          sizes="(min-width: 768px) 520px, 90vw"
          className="aspect-square rounded-[28px] bg-[#d9d3c3]"
        />
      </section>

      <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
        <CatalogMarket />
      </Suspense>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        {[
          ['Lançamentos gênesis de edição limitada', 'Colecione edições escassas diretamente dos criadores antes da revelação pública.'],
          ['Arte digital selecionada e muito mais', 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.'],
        ].map(([title, text]) => (
          <article key={title} className="grid items-center gap-4 rounded-xl bg-panel p-4 sm:grid-cols-[140px_1fr]">
            <NftMedia art={{ image: '/nfts/emerald-960.webp', thumb: '/nfts/emerald-640.webp', imageAlt: '' }} className="aspect-square rounded-lg" />
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-gold-2">{text}</p>
              <Button className="mt-4" size="sm" onClick={() => document.getElementById('catalogo')?.scrollIntoView()}>Explorar</Button>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-14" aria-labelledby="diario-title">
        <h2 id="diario-title" className="text-center font-display text-3xl">Diário da Cunhagem</h2>
        <p className="mt-2 text-center text-sm text-gold-2">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['12 de setembro', 'Como funciona a propriedade de NFTs'],
            ['13 de setembro', '10 artistas digitais para acompanhar'],
            ['15 de setembro', 'Raridade, atributos e procedência'],
            ['15 de setembro', 'Como proteger sua carteira'],
          ].map(([date, title]) => (
            <article key={title} className="overflow-hidden rounded-xl bg-panel">
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
