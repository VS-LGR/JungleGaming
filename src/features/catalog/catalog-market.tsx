import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { fetchCatalog } from '@/api/endpoints'
import { NftMedia } from '@/components/nft-media'
import { PointerTilt } from '@/components/pointer-tilt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { PRICE_MAX, PRICE_MIN, categories, networks, sorts, tabs, type CatalogQuery, type SortId } from '@/contracts/types'
import { rememberNftVersion } from '@/features/session'
import { cachePolicy } from '@/lib/cache-policy'
import { formatEth, formatEthLabel } from '@/lib/money'
import type { HomeSearch } from '@/features/catalog/home-page'

export function CatalogMarket() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftMin, setDraftMin] = useState(Number(search.min ?? PRICE_MIN) * 1000)
  const [draftMax, setDraftMax] = useState(Number(search.max ?? PRICE_MAX) * 1000)
  const catalog = useQuery({
    queryKey: ['nfts', search],
    queryFn: async ({ signal }) => {
      const data = await fetchCatalog(toQuery(search), signal)
      data.items.forEach((item) => rememberNftVersion(item.id, item.version))
      return data
    },
    placeholderData: keepPreviousData,
    staleTime: cachePolicy.catalog.staleTime,
  })

  function update(partial: Partial<HomeSearch>, resetPage = true) {
    void navigate({
      to: '/',
      search: {
        q: search.q,
        category: search.category,
        network: search.network,
        tab: search.tab,
        sort: search.sort,
        min: search.min,
        max: search.max,
        ...partial,
        page: resetPage ? 1 : (partial.page ?? search.page),
      },
    })
  }

  const filters = (
    <Filters
      search={search}
      draftMin={draftMin}
      draftMax={draftMax}
      onDraft={(min, max) => {
        setDraftMin(min)
        setDraftMax(max)
      }}
      onChange={update}
    />
  )

  return (
    <>
      <div className="mb-4 md:hidden">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            update({ q: String(data.get('q') ?? '') })
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-gold" />
            <Input name="q" defaultValue={search.q} aria-label="Explorar coleções" placeholder="Explorar coleções" className="pl-10" />
          </div>
          <Button type="button" variant="outline" aria-label="Abrir filtros" onClick={() => setFiltersOpen(true)}>Filtros</Button>
        </form>
      </div>

      <section id="catalogo" className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">{filters}</aside>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent>
            <SheetTitle>Filtros</SheetTitle>
            <div className="mt-6">{filters}</div>
          </SheetContent>
        </Sheet>
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-4 border-b border-line" role="tablist" aria-label="Recortes do catálogo">
              {tabs.map((tab) => {
                const selected = search.tab === tab.id
                return (
                  <button key={tab.id} type="button" role="tab" aria-selected={selected} className={`border-b-2 pb-2 text-sm ${selected ? 'border-amber text-cream' : 'border-transparent text-gold'}`} onClick={() => update({ tab: tab.id })}>
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-sm text-gold-2">
              Ordenar por:
              <Select value={search.sort} onValueChange={(value) => update({ sort: value as SortId })}>
                <SelectTrigger className="h-10 w-56" aria-label="Ordenar por">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorts.map((sort) => (
                    <SelectItem key={sort.id} value={sort.id}>{sort.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          {catalog.isLoading ? <CatalogSkeleton /> : null}
          {catalog.isError ? (
            <div role="alert" className="rounded-lg border border-line p-6">
              <p>Não foi possível carregar o catálogo.</p>
              <Button className="mt-4" onClick={() => void catalog.refetch()}>Tentar novamente</Button>
            </div>
          ) : null}
          {catalog.data && catalog.data.items.length === 0 ? (
            <p className="rounded-lg border border-line p-6 text-gold-2">Nenhum NFT encontrado com esses filtros.</p>
          ) : null}
          {catalog.data && catalog.data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-busy={catalog.isFetching}>
              {catalog.data.items.map((nft) => (
                <article key={nft.id} className="min-w-0">
                  <Link to="/nfts/$nftId" params={{ nftId: nft.id }} search={{ edition: '1-50', qty: 1 }} className="motion-card group block">
                    <PointerTilt className="relative aspect-square overflow-hidden rounded-xl bg-[#d9d3c3]">
                      {nft.rare ? <Badge className="absolute top-3 left-3 z-10">RARO</Badge> : null}
                      <NftMedia art={nft} />
                      <span className="motion-reveal pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-full bg-ink/80 px-3 py-1 text-center text-xs text-cream">Abrir obra</span>
                    </PointerTilt>
                    <h2 className="mt-3 truncate text-sm">{nft.name}</h2>
                    <p className="text-sm font-semibold text-amber">
                      {formatEthLabel(nft.listPriceEth)}{' '}
                      {nft.compareAtEth ? <span className="font-normal text-gold line-through">{formatEth(nft.compareAtEth)} ETH</span> : null}
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
          {catalog.data && catalog.data.totalPages > 1 ? (
            <nav className="mt-6 flex justify-end gap-2" aria-label="Paginação">
              {Array.from({ length: catalog.data.totalPages }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" aria-current={page === catalog.data?.page ? 'page' : undefined} className={`motion-press size-8 rounded-md border border-line text-sm ${page === catalog.data?.page ? 'bg-amber text-ink' : ''}`} onClick={() => update({ page }, false)}>
                  {page}
                </button>
              ))}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  )
}

function Filters({
  search,
  draftMin,
  draftMax,
  onDraft,
  onChange,
}: {
  search: HomeSearch
  draftMin: number
  draftMax: number
  onDraft: (min: number, max: number) => void
  onChange: (partial: Partial<HomeSearch>) => void
}) {
  const catalog = useQuery({ queryKey: ['nfts', search], queryFn: ({ signal }) => fetchCatalog(toQuery(search), signal) })
  const facets = catalog.data?.facets
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 font-semibold">Coleções</h2>
        <ul className="space-y-2">
          {categories.map((category) => {
            const count = facets?.categories.find((item) => item.id === category.id)?.count ?? 0
            const active = search.category === category.id
            return (
              <li key={category.id}>
                <button type="button" aria-pressed={active} className={`motion-press flex w-full justify-between text-sm ${active ? 'text-amber' : 'text-gold-2'}`} onClick={() => onChange({ category: active ? undefined : category.id })}>
                  <span>{category.label}</span>
                  <span>({count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">Faixa de preço</h2>
        <Slider
          min={20}
          max={12300}
          step={10}
          value={[draftMin, draftMax]}
          onValueChange={(value) => onDraft(value[0] ?? 20, value[1] ?? 12300)}
        />
        <p className="mt-3 text-sm text-gold-2">Preço: {formatEth(String(draftMin / 1000))} – {formatEth(String(draftMax / 1000))} ETH</p>
        <Button
          className="mt-3"
          size="sm"
          onClick={() =>
            onChange({
              min: draftMin <= 20 ? undefined : (draftMin / 1000).toFixed(3),
              max: draftMax >= 12300 ? undefined : (draftMax / 1000).toFixed(3),
            })
          }
        >
          Aplicar
        </Button>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">Rede</h2>
        <ul className="space-y-2">
          {networks.map((network) => {
            const count = facets?.networks.find((item) => item.id === network.id)?.count ?? 0
            const active = search.network === network.id
            return (
              <li key={network.id}>
                <button type="button" aria-pressed={active} className={`motion-press flex w-full justify-between text-sm ${active ? 'text-amber' : 'text-gold-2'}`} onClick={() => onChange({ network: active ? undefined : network.id })}>
                  <span>{network.label}</span>
                  <span>({count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <Link to="/nfts/$nftId" params={{ nftId: 'cosmic-bloom-0118' }} search={{ edition: '1-50', qty: 1 }} className="motion-card block overflow-hidden rounded-xl bg-panel">
        <p className="px-4 pt-4 font-display text-amber">NFT EM DESTAQUE</p>
        <p className="px-4 text-sm">OFERTA LIMITADA</p>
        <NftMedia art={{ image: '/nfts/violet-960.webp', thumb: '/nfts/violet-640.webp', imageAlt: 'Cosmic Bloom em destaque' }} className="mt-3 aspect-square" />
      </Link>
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" data-testid="catalog-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-square" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

function toQuery(search: HomeSearch): CatalogQuery {
  return {
    q: search.q,
    category: search.category,
    network: search.network,
    tab: search.tab,
    sort: search.sort,
    page: search.page,
    pageSize: 9,
    minPrice: search.min,
    maxPrice: search.max,
  }
}
