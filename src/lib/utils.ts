import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function categoryLabel(id: string) {
  const labels: Record<string, string> = {
    'arte-digital': 'Arte digital',
    fotografia: 'Fotografia',
    musica: 'Música',
    'arte-3d': 'Arte 3D',
    colecionaveis: 'Colecionáveis',
    generativa: 'Generativa',
    jogos: 'Jogos',
    assinaturas: 'Assinaturas',
    utilidade: 'Utilidade',
  }
  return labels[id] ?? id
}

export function networkLabel(id: string) {
  const labels: Record<string, string> = {
    ethereum: 'Ethereum',
    polygon: 'Polygon',
    solana: 'Solana',
  }
  return labels[id] ?? id
}
