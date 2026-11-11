import {
  PASSWORD_HASH,
  type CategoryId,
  type Database,
  type Edition,
  type NetworkId,
  type Nft,
  type UserRecord,
  type Wallet,
} from '@/contracts/types'
import { mulEth } from '@/lib/money'

const arts = [
  {
    image: '/nfts/emerald-960.webp',
    thumb: '/nfts/emerald-640.webp',
    alt: 'Macaco ilustrado com jaqueta verde e óculos redondos',
  },
  {
    image: '/nfts/golden-960.webp',
    thumb: '/nfts/golden-640.webp',
    alt: 'Macaco ilustrado dourado com fones verdes',
  },
  {
    image: '/nfts/ivory-960.webp',
    thumb: '/nfts/ivory-640.webp',
    alt: 'Macaco ilustrado de casaco claro e gola alta',
  },
  {
    image: '/nfts/violet-960.webp',
    thumb: '/nfts/violet-640.webp',
    alt: 'Macaco ilustrado de capuz roxo e chapéu',
  },
] as const

type Row = [
  name: string,
  token: string,
  art: 0 | 1 | 2 | 3,
  category: CategoryId,
  network: NetworkId,
  price: string,
  flags: string,
]

const rows: Row[] = [
  ['Emerald Ape', '0042', 0, 'arte-digital', 'ethereum', '1.190', 'rare,trending,new'],
  ['Sage Nomad', '0009', 3, 'fotografia', 'ethereum', '1.690', 'new'],
  ['Neon Vessel', '0552', 2, 'arte-3d', 'polygon', '1.990', 'trending,compare'],
  ['Cosmic Bloom', '0118', 3, 'colecionaveis', 'solana', '1.290', 'featured,new'],
  ['Violet Nomad', '0314', 3, 'fotografia', 'ethereum', '1.390', 'trending'],
  ['Ivory Baron', '0088', 2, 'arte-digital', 'polygon', '1.790', ''],
  ['Golden Beat', '0207', 1, 'musica', 'ethereum', '0.990', 'trending,new'],
  ['Golden Frequency', '0071', 1, 'musica', 'solana', '0.590', ''],
  ['Golden Signal', '0160', 1, 'generativa', 'ethereum', '0.390', 'new'],
  ['Coral Note', '0201', 1, 'musica', 'polygon', '0.450', 'new'],
  ['Amber Archive', '0210', 2, 'fotografia', 'ethereum', '2.150', ''],
  ['Solar Script', '0211', 0, 'generativa', 'solana', '0.720', 'new,trending'],
  ['Midnight Utility', '0212', 2, 'utilidade', 'polygon', '0.880', ''],
  ['Orbit Pass', '0213', 1, 'assinaturas', 'ethereum', '1.250', ''],
  ['Jungle Player', '0214', 0, 'jogos', 'polygon', '0.640', 'new'],
  ['Bronze Relic', '0215', 3, 'colecionaveis', 'ethereum', '3.400', 'rare'],
  ['Paper Garden', '0216', 2, 'arte-digital', 'solana', '1.050', ''],
  ['Vinyl Saint', '0217', 1, 'musica', 'ethereum', '0.810', ''],
  ['Lens Ritual', '0218', 3, 'fotografia', 'polygon', '1.480', 'trending'],
  ['Clay Engine', '0219', 0, 'arte-3d', 'ethereum', '2.290', ''],
  ['Seed Lottery', '0220', 1, 'jogos', 'solana', '0.510', ''],
  ['Quiet License', '0221', 2, 'assinaturas', 'polygon', '1.110', ''],
  ['Moss Contract', '0222', 3, 'utilidade', 'ethereum', '0.960', 'new'],
  ['High Canopy', '0223', 0, 'arte-digital', 'ethereum', '4.800', 'rare,trending'],
  ['Dusk Chorus', '0224', 1, 'musica', 'solana', '0.670', ''],
  ['Frame Eleven', '0225', 2, 'fotografia', 'ethereum', '1.330', ''],
  ['Pixel Orchard', '0226', 0, 'generativa', 'polygon', '0.540', 'new'],
  ['Token Drum', '0227', 1, 'jogos', 'ethereum', '0.770', ''],
  ['Member Key', '0228', 3, 'assinaturas', 'solana', '1.020', ''],
  ['Field Manual', '0229', 2, 'utilidade', 'ethereum', '0.430', ''],
  ['Rare Collar', '0230', 0, 'colecionaveis', 'polygon', '6.200', 'rare'],
  ['Glass Ape', '0231', 2, 'arte-3d', 'solana', '2.040', 'trending'],
  ['Low Tide', '0232', 3, 'fotografia', 'ethereum', '1.170', ''],
  ['Chorus Mint', '0233', 1, 'musica', 'polygon', '0.360', 'new'],
  ['North Gate', '0234', 0, 'arte-digital', 'ethereum', '8.400', 'rare'],
  ['Last Signal', '0235', 1, 'generativa', 'solana', '12.100', 'trending'],
]

function slug(name: string, token: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${token}`
}

function editions(price: string, rare: boolean): Edition[] {
  return [
    {
      id: '1-1',
      label: '1/1',
      supply: 1,
      remaining: rare ? 0 : 1,
      priceEth: mulEth(price, 3),
      available: !rare,
    },
    {
      id: '1-10',
      label: '1/10',
      supply: 10,
      remaining: 10,
      priceEth: mulEth(price, 2),
      available: true,
    },
    {
      id: '1-50',
      label: '1/50',
      supply: 50,
      remaining: 50,
      priceEth: price,
      available: true,
    },
    {
      id: 'open',
      label: 'Aberta',
      supply: null,
      remaining: null,
      priceEth: price,
      available: true,
    },
  ]
}

export function createNfts(): Nft[] {
  return rows.map((row, index) => {
    const [name, token, artIndex, category, network, price, flags] = row
    const art = arts[artIndex]
    const flag = new Set(flags.split(',').filter(Boolean))
    const id = slug(name, token)
    return {
      id,
      tokenId: token,
      name: `${name} #${token}`,
      image: art.image,
      thumb: art.thumb,
      imageAlt: `${art.alt}, obra ${name}`,
      category,
      network,
      listPriceEth: price,
      compareAtEth: flag.has('compare') ? '2.290' : null,
      rare: flag.has('rare'),
      isNew: flag.has('new'),
      trending: flag.has('trending'),
      featured: flag.has('featured'),
      rating: 4 + ((index % 5) * 0.2),
      ratingCount: 8 + (index % 17),
      createdAt: new Date(Date.UTC(2026, 6, 29 - index, 12, 0, 0)).toISOString(),
      description: `${name} #${token} é um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${network === 'solana' ? 'Solana' : network === 'polygon' ? 'Polygon' : 'Ethereum'}.`,
      longDescription: `${name} #${token} é uma obra digital da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e a procedência é registrada na rede. A propriedade inclui a arte em alta resolução, lançamentos para colecionadores e um registro permanente de procedência.`,
      collection: 'Kurio Apes',
      attributes: artIndex === 0 ? ['Óculos', 'Esmeralda', 'Raro'] : ['Kurio', 'Edição', category],
      editions: editions(price, flag.has('rare')),
      contract: '0x7A42...19E8',
      royalty: '5% nas vendas secundárias',
      reviews: [
        {
          id: `${id}-r1`,
          author: 'Nova Sato',
          rating: 5,
          text: 'A ficha e a edição conferem com o que está no catálogo.',
        },
        {
          id: `${id}-r2`,
          author: 'Ada Lopes',
          rating: 4,
          text: 'Boa procedência e preço coerente com a edição escolhida.',
        },
      ],
      version: 1,
    }
  })
}

function wallet(partial: Omit<Wallet, 'id' | 'role' | 'sameAsPrimary'> & { id: string; role: Wallet['role'] }): Wallet {
  return { ...partial, sameAsPrimary: false }
}

const nova: UserRecord = {
  id: 'user-nova',
  email: 'nova@kurio.test',
  passwordHash: PASSWORD_HASH,
  displayName: 'Nova Sato',
  username: 'nova',
  ensName: 'nova.kurio',
  walletNickname: 'Principal',
  avatarUrl: null,
  favoriteIds: ['emerald-ape-0042'],
}

const ada: UserRecord = {
  id: 'user-ada',
  email: 'ada@kurio.test',
  passwordHash: PASSWORD_HASH,
  displayName: 'Ada Lopes',
  username: 'ada',
  ensName: 'ada.kurio',
  walletNickname: 'Reserva',
  avatarUrl: null,
  favoriteIds: ['violet-nomad-0314'],
}

export function createSeed(): Database {
  return {
    users: [structuredClone(nova), structuredClone(ada)],
    sessions: [],
    nfts: createNfts(),
    carts: {
      'user:user-nova': [{ nftId: 'sage-nomad-0009', editionId: '1-50', quantity: 1, seenPriceEth: '1.690' }],
      'user:user-ada': [{ nftId: 'golden-beat-0207', editionId: '1-50', quantity: 1, seenPriceEth: '0.990' }],
    },
    wallets: {
      'user-nova': {
        primary: wallet({
          id: 'wal-nova-primary',
          role: 'primary',
          displayName: 'Nova Sato',
          nickname: 'Principal',
          network: 'ethereum',
          profileName: 'Nova',
          address: '0xA91F00000000000000000000000000000000E82C',
          walletType: 'metamask',
          email: 'nova@kurio.test',
          ensName: 'nova.kurio',
          referralCode: 'KURIO',
        }),
        secondary: wallet({
          id: 'wal-nova-secondary',
          role: 'secondary',
          displayName: 'Nova Sato',
          nickname: 'Reserva',
          network: 'polygon',
          profileName: 'Nova',
          address: '0xB12C00000000000000000000000000000000A91F',
          walletType: 'coinbase',
          email: 'nova@kurio.test',
          ensName: 'nova.kurio',
          referralCode: 'KURIO',
        }),
      },
      'user-ada': {
        primary: wallet({
          id: 'wal-ada-primary',
          role: 'primary',
          displayName: 'Ada Lopes',
          nickname: 'Ateliê',
          network: 'solana',
          profileName: 'Ada',
          address: 'AdaKurio11111111111111111111111111111111',
          walletType: 'walletconnect',
          email: 'ada@kurio.test',
          ensName: 'ada.kurio',
          referralCode: 'ADA',
        }),
        secondary: null,
      },
    },
    orders: [],
    idempotency: [],
    priceBumpApplied: false,
    soldOutApplied: false,
    staleEventApplied: false,
    catalogFailures: 0,
    sessionRenewed: false,
  }
}
