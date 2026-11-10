const files = ['emerald', 'golden', 'ivory', 'violet'] as const

const alts = [
  'Macaco ilustrado com jaqueta verde e óculos redondos',
  'Macaco ilustrado dourado com fones verdes',
  'Macaco ilustrado de casaco claro e gola alta',
  'Macaco ilustrado de capuz roxo e chapéu',
] as const

const indexById: Record<string, 0 | 1 | 2 | 3> = {
  'emerald-ape-0042': 0,
  'sage-nomad-0009': 3,
  'neon-vessel-0552': 2,
  'cosmic-bloom-0118': 3,
  'violet-nomad-0314': 3,
  'ivory-baron-0088': 2,
  'golden-beat-0207': 1,
  'golden-frequency-0071': 1,
  'golden-signal-0160': 1,
  'coral-note-0201': 1,
  'amber-archive-0210': 2,
  'solar-script-0211': 0,
  'midnight-utility-0212': 2,
  'orbit-pass-0213': 1,
  'jungle-player-0214': 0,
  'bronze-relic-0215': 3,
  'paper-garden-0216': 2,
  'vinyl-saint-0217': 1,
  'lens-ritual-0218': 3,
  'clay-engine-0219': 0,
  'seed-lottery-0220': 1,
  'quiet-license-0221': 2,
  'moss-contract-0222': 3,
  'high-canopy-0223': 0,
  'dusk-chorus-0224': 1,
  'frame-eleven-0225': 2,
  'pixel-orchard-0226': 0,
  'token-drum-0227': 1,
  'member-key-0228': 3,
  'field-manual-0229': 2,
  'rare-collar-0230': 0,
  'glass-ape-0231': 2,
  'low-tide-0232': 3,
  'chorus-mint-0233': 1,
  'north-gate-0234': 0,
  'last-signal-0235': 1,
}

export function coverFor(id: string) {
  const index = indexById[id]
  if (index === undefined) return null
  const file = files[index]
  return {
    image: `/nfts/${file}-960.webp`,
    thumb: `/nfts/${file}-640.webp`,
    imageAlt: alts[index],
  }
}
