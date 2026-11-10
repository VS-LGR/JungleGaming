import { Link, useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { emptyHomeSearch } from '@/features/catalog/home-page'

export function ExplorerPage() {
  const { tx } = useParams({ strict: false }) as { tx: string }
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs tracking-[0.2em] text-amber">EXPLORADOR SIMULADO</p>
      <h1 className="mt-3 font-display text-4xl">Transação</h1>
      <p className="mt-4 break-all text-gold-2">{tx}</p>
      <p className="mt-3 text-sm text-gold-2">Este link não consulta uma rede real. A referência faz parte do recibo simulado da Kurio.</p>
      <Button className="mt-6" asChild><Link to="/" search={emptyHomeSearch}>Voltar ao início</Link></Button>
    </div>
  )
}
