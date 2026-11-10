import { useNavigate } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyHomeSearch } from '@/features/catalog/home-page'

export function UnavailableDialog({ topic, onClose }: { topic: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{topic}</DialogTitle>
        <DialogDescription>Esta área não faz parte desta versão do marketplace. Nenhuma ação foi concluída.</DialogDescription>
      </DialogContent>
    </Dialog>
  )
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Buscar coleções</DialogTitle>
        <DialogDescription>A busca fica na URL e continua depois de atualizar a página.</DialogDescription>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            onClose()
            void navigate({ to: '/', search: { ...emptyHomeSearch, q: String(data.get('q') ?? ''), page: 1 } })
          }}
        >
          <Input name="q" aria-label="Buscar coleções" placeholder="Explorar coleções" />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
