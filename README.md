# Kurio

Marketplace de NFTs em React e TypeScript. O catálogo, o carrinho, o pagamento e a conta rodam no navegador com dados simulados por MSW e eventos Socket.IO. Não há serviço privado: um checkout limpo sobe com `npm install` e `npm run dev`.

Este projeto está **fora de escopo BPx**. É um desafio de interface, sem impacto em qualidade, paciente, produção ou registro regulatório.

## Requisitos

- Node.js 20.19+ ou 22.12+ (o Vite 8 avisa em versões anteriores; 20.18 ainda gera o build neste ambiente)
- npm

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run dev
```

A aplicação abre em `http://127.0.0.1:5173`. O preview de produção usa `http://127.0.0.1:4173`.

`VITE_ENABLE_MSW` fica `true` por padrão. Só desligue com o valor exato `false`.

## Credenciais

| E-mail | Senha | Coleção |
| --- | --- | --- |
| `nova@kurio.test` | `Kurio#2026` | favorito Emerald Ape, carrinho Sage Nomad, carteiras Ethereum e Polygon |
| `ada@kurio.test` | `Kurio#2026` | favorito Violet Nomad, carrinho Golden Beat, carteira Solana |

A senha nunca é gravada em claro. O mock guarda o SHA-256.

## Cenários

O cenário ativo fica em `localStorage` (`kurio-scenario`). A URL `?cenario=` grava e passa a valer na hora. A página `/laboratorio` troca o cenário e restaura o seed pela própria API.

| Cenário | Efeito |
| --- | --- |
| `default` | sucesso, pagamento confirmado |
| `empty` | catálogo vazio |
| `slow` | 1,6 s de latência |
| `variable-latency` | atraso estável por URL |
| `out-of-order` | páginas maiores respondem antes |
| `offline` | falha de rede |
| `server-error` | 503 no catálogo, inclusive na nova tentativa |
| `transient-error` | as três primeiras listagens falham e a seguinte carrega |
| `session-expired` | 401 em rota autenticada |
| `register-conflict` | 409 no cadastro |
| `coupon-invalid` | `KURIO10` deixa de valer |
| `coupon-expired` | `KURIO10` expira |
| `price-changed` | Emerald Ape sobe 0,100 ETH |
| `edition-sold-out` | edição 1/50 do Emerald Ape esgota |
| `order-timeout` | a criação demora e a mesma chave recupera o pedido |
| `delayed-settle` | o pedido fica pendente por 4 s antes de confirmar |
| `payment-confirmed` | recibo confirmado |
| `payment-refused` | pagamento recusado, carrinho preservado |
| `favorite-fail` | favorito responde 500 |
| `duplicate-event` | o mesmo `nft.updated` chega duas vezes |
| `stale-event` | um evento antigo chega depois do atual |
| `drop-socket` | o socket cai com o pedido pendente e a API reconcilia |

Cupom válido no cenário padrão: `KURIO10` (10%). `VENCIDO` sempre expira. Qualquer outro código é inválido.

## Reset

`POST /api/mock/reset` ou o botão da página `/laboratorio` regrava o seed. O estado vive em `localStorage` na chave `kurio-db-v1`. Apagar essa chave também volta ao seed no próximo carregamento.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Vite em desenvolvimento |
| `npm run build` | checagem de tipos e build |
| `npm run preview` | serve o `dist` |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | oxlint |
| `npm run test:e2e` | Playwright em Chromium, 1440 e 390; o HTML fica em `reports/playwright` e o trace só quando um teste falha |
| `npm run test:e2e:update` | atualiza os baselines visuais |
| `npm run lighthouse` | três medições de início e detalhe, mobile e desktop |

O preview precisa estar em `http://127.0.0.1:4173` antes do Lighthouse (`LH_URL` troca a origem). Os relatórios vão para `reports/lighthouse`. A mediana desta máquina está em `reports/lighthouse/summary.json`: Performance 90/100/92/100, Acessibilidade 100, Best Practices 100 e SEO 92, nas páginas início e detalhe, mobile e desktop. O worker do MSW não expõe o tempo de rede que a simulação do Lighthouse precisa, então a auditoria usa o throttling real do DevTools (Slow 4G no mobile e rede de desktop). Imagem, fonte e função permanecem ligadas.

## Como reproduzir uma falha

1. Abra `/?cenario=server-error` para o catálogo indisponível, ou outro nome da tabela.
2. Entre com uma das contas se o fluxo for privado.
3. Recarregue: o cenário permanece até o reset ou até outra escolha.
4. Para o pedido que expira e se recupera, use `order-timeout`, confirme uma compra e aguarde a mesma chave devolver o recibo.
5. Para a queda do socket, use `drop-socket`: o recibo pendente passa a confirmado depois que a tela consulta a API de novo.
