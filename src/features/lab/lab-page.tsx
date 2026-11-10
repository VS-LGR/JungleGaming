import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { resetMock, selectScenario } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { scenarioNames } from '@/mocks/scenarios'
import { setScenarioName } from '@/lib/storage'

export function LabPage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('Cenário padrão ativo.')
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl">Laboratório de cenários</h1>
      <p className="mt-3 text-sm text-gold-2">Os cenários alteram a rede simulada. O reset restaura os dois colecionadores, o catálogo e o carrinho conhecidos.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {scenarioNames.map((name) => (
          <Button
            key={name}
            variant="outline"
            size="sm"
            onClick={() => {
              setScenarioName(name)
              void selectScenario(name).then(() => {
                void queryClient.invalidateQueries()
                setMessage(`Cenário ${name} selecionado.`)
              })
            }}
          >
            {name}
          </Button>
        ))}
      </div>
      <Button
        className="mt-6"
        onClick={() => {
          localStorage.removeItem('kurio-db-v1')
          void resetMock().then(() => {
            void queryClient.clear()
            setMessage('Cenário conhecido restaurado.')
          })
        }}
      >
        Resetar dados
      </Button>
      <p className="mt-4" role="status">{message}</p>
    </div>
  )
}
