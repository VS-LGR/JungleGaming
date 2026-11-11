import { useEffect, useState } from 'react'

export type Edition = 'propria' | 'figma'

const KEY = 'kurio-edition'

export function getEdition(): Edition {
  if (typeof localStorage === 'undefined') return 'propria'
  return localStorage.getItem(KEY) === 'figma' ? 'figma' : 'propria'
}

export function applyEdition(edition = getEdition()) {
  document.documentElement.dataset.edition = edition
}

export function setEdition(edition: Edition) {
  localStorage.setItem(KEY, edition)
  applyEdition(edition)
  window.dispatchEvent(new Event('kurio-edition'))
}

export function useEdition() {
  const [edition, setState] = useState<Edition>(getEdition)
  useEffect(() => {
    const sync = () => setState(getEdition())
    window.addEventListener('kurio-edition', sync)
    return () => window.removeEventListener('kurio-edition', sync)
  }, [])
  return edition
}
