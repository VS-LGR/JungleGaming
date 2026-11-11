# Arquitetura da Kurio

SPA Vite + React + TypeScript. TanStack Router no cliente, TanStack Query, Axios e MSW no navegador. O deploy é estático: a Vercel reescreve rotas sem ponto para `index.html` e deixa JS, CSS e imagens passarem.

Fora de escopo BPx: dados simulados, sem registro regulatório.

## Contratos REST

Base `/api`. O corpo de erro é `{ error: { code, message, fields? } }`. ETH trafega como string decimal. Quantidade é inteira. A cotação da API é a única base do pedido.

| Método | Rota | Função |
| --- | --- | --- |
| POST | `/api/mock/reset` | restaura o seed |
| POST | `/api/mock/scenario` | grava o cenário |
| POST | `/api/auth/register` | cria a conta; 409 se e-mail ou usuário existir |
| POST | `/api/auth/login` | devolve token opaco e funde o carrinho do visitante |
| POST | `/api/auth/logout` | encerra a sessão |
| GET | `/api/auth/session` | sessão atual |
| GET | `/api/nfts` | lista com `q`, `category`, `minPrice`, `maxPrice`, `network`, `tab`, `sort`, `page` |
| GET | `/api/nfts/:id` | detalhe ou 404 |
| GET | `/api/favorites` | ids do usuário |
| PUT / DELETE | `/api/favorites/:id` | inclui ou remove |
| GET | `/api/cart` | itens do dono atual |
| POST / PATCH / DELETE | `/api/cart/items` | inclui, define quantidade ou remove |
| GET | `/api/quotes` | cotação com `coupon` e `network` |
| POST | `/api/quotes/ack` | copia o preço atual para `seenPriceEth` |
| POST | `/api/orders` | cria o pedido; exige `Idempotency-Key` |
| GET | `/api/orders/:id` | recibo do dono |
| GET / PATCH | `/api/profile` | leitura e atualização |
| POST / DELETE | `/api/profile/avatar` | envia ou remove o avatar |
| POST | `/api/profile/password` | troca a senha |
| GET | `/api/wallets` | principal e secundária |
| PUT | `/api/wallets/:role` | grava `primary` ou `secondary` |
| DELETE | `/api/wallets/secondary` | remove a secundária |

Códigos usados: 400, 401, 403, 404, 409 e 503, além de falha de rede e timeout. A cotação obsoleta responde 409 com `{ error: { code: 'quote_stale', message, quote } }`.

A mesma `Idempotency-Key` com o mesmo corpo devolve o mesmo pedido. A mesma chave com outro corpo responde 409. O cliente guarda `{ hash, key }` em `sessionStorage` (`kurio-order-attempt`). O POST do pedido usa timeout de 3 s e, só nesse caso, repete uma vez com a mesma chave.

## Eventos

Transporte: Socket.IO com `transports: ['websocket']`. O cliente só é importado depois de `worker.start()`, porque o Engine.IO captura `WebSocket` na carga do módulo.

`nft.updated` e `order.updated` trazem `eventId`, `resourceId`, `version` e `payload`. O pedido também traz `userId`.

O cliente ignora `eventId` já visto e `version` menor ou igual à que já conhece. Evento de outro usuário é descartado. No logout e no unmount o socket é desligado e os mapas de versão são limpos. Depois de reconectar, as telas ativas invalidam catálogo, detalhe, cotação e pedido e leem de novo pela REST.

O MSW remove o prefixo `/socket.io/` antes de casar a URL, então o handler escuta `*`. O binding `@mswjs/socket.io-binding` envia o handshake `0` e `40`. Limites: sem rooms, sem polling Engine.IO e sem garantia de ordem entre abas. O estado do mock vive na página, não num processo separado.

## Sessão

O token opaco fica em `kurio-token` e vale 12 horas. O vencimento fica em `kurio-session-exp`. A senha fica só como SHA-256. O visitante tem `kurio-guest-id`. Um 401 fora de login e cadastro, ou o vencimento local das 12 horas, apaga o token, limpa o cache privado e manda para `/entrar`, guardando o caminho atual em `redirect`. Um novo login retoma esse caminho, inclusive `/pagamento`.

O cenário `session-expired` invalida a sessão atual. O login seguinte marca a sessão como renovada e volta a valer. O relógio do Playwright não alcança o service worker do MSW; o vencimento de 12 horas é lido no cliente, e os testes avançam esse relógio com `page.clock`. Latência e liquidação do pedido continuam nos cenários.

Rotas privadas: `/pagamento`, `/pedidos/$orderId`, `/conta/perfil`, `/conta/carteiras`.

## Carrinho e cotação

O dono é `user:{id}` ou `guest:{guestId}`. Incluir soma a quantidade; alterar define a quantidade. O teto é o estoque da edição, no máximo 20. A edição aberta usa o teto de 20.

A cotação calcula subtotal, 10% de desconto quando o cupom vale, taxa de rede (`ethereum` 0.016, `polygon` 0.008, `solana` 0.004) e total com `decimal.js` (precisão 40). O `quoteId` inclui a versão dos itens, o cupom e a rede. A cotação fica bloqueada se estiver vazia, indisponível, com preço diferente do visto ou com cupom inválido. O pagamento só confirma depois que o colecionador aceita a cotação nova e a carteira simulada está conectada.

O sucesso remove só as quantidades compradas e baixa o estoque. Quantidade acrescentada enquanto o pedido está pendente permanece no carrinho. A recusa não mexe no carrinho. O cenário `delayed-settle` espera 4 s para tornar essa janela reproduzível. `transient-error` falha as três leituras do catálogo que o TanStack Query tenta sozinho; o botão Tentar novamente recebe a lista. O recibo guarda o snapshot: uma mudança posterior no catálogo não altera os valores. “Ver no Etherscan” abre `/explorador/:tx`, um explorador simulado.

## Cache

Definido em `src/lib/cache-policy.ts`.

- A chave da lista inclui todos os parâmetros da URL.
- A paginação usa `placeholderData` para manter a página anterior.
- O Axios recebe o `AbortSignal` da query.
- Leitura tenta de novo até duas vezes, exceto 400, 401, 403, 404 e 409.
- Mutation não tenta de novo.
- Favorito atualiza a lista local e desfaz se a API falhar.
- Logout e 401 removem chaves privadas (`favorites`, `quote`, `order`, `profile`, `wallets`, `session`) e o socket.

## Reconciliação

O evento ao vivo invalida o recurso. Se o socket cair, a tela do pedido e a do pagamento escutam a reconexão e consultam a REST. No cenário `drop-socket`, o mock fecha os sockets, confirma o pedido e reenvia o estado terminal no próximo `session.hello`.

## Versões da interface

Há duas apresentações da mesma aplicação. O controle **Própria** / **Figma** fica no cabeçalho a partir de 1024 px e, abaixo disso, acima da barra móvel. A escolha fica em `localStorage` (`kurio-edition`) e em `document.documentElement.dataset.edition`. Sem valor gravado, abre a Própria. Rotas, contratos, sessão, carrinho e eventos são os mesmos nas duas.

**Figma** é a apresentação pedida no desafio. O herói troca pelos três pontos, sem barra de tempo e sem avanço automático. O catálogo começa logo abaixo do herói. O cartão mostra imagem, nome e preço. A barra lateral fica direto na página, sem o painel “A LOJA” e sem o bloco “MERCADO KURIO”. Detalhe, carrinho, pagamento, recibo, perfil e carteiras são iguais nas duas versões: o aprimoramento não redesenhou essas telas, e elas seguem os frames com os ajustes listados em Decisões de interface.

**Própria** é o aprimoramento e o padrão da suíte visual. No desktop o herói ocupa a altura útil (`100svh` menos o cabeçalho) e a loja desce. Os três destaques avançam sozinhos a cada 5,6 s. A barra ao lado dos pontos enche com o tempo já decorrido; o trecho que falta é o tempo restante. O primeiro clique pausa e o segundo continua. O nome acessível fica na própria barra. O texto que sai some em 280 ms. O que entra permanece em creme e é revelado por uma máscara horizontal, com a borda suave percorrendo o título em cerca de 1,2 s. Com `prefers-reduced-motion: reduce` a barra não avança e a máscara não corre. A loja abre o espaçamento, usa painel na lateral, mostra a rede e o título em Oswald. Obra rara (`nft.rare`) recebe uma borda em âmbar, ouro e creme e um miolo de vidro nessas mesmas cores; o brilho acompanha o ponteiro. A versão Figma não renderiza a barra, a máscara nem o vidro.

## Decisões de interface

- Desktop e mobile respondem às mesmas rotas. Login e cadastro são páginas em `/entrar` e `/cadastro`. No desktop o frame original é um diálogo sobre o início; a página inteira preserva o formulário, o foco e o retorno ao fluxo. As duas versões usam essas páginas.
- Perfil, carteiras e recibo no mobile usam a mesma hierarquia empilhada, com a navegação da conta e o recibo em página.
- Comprar inclui a edição e a quantidade e segue para o carrinho. O outro botão só adiciona.
- A busca, os filtros, a ordenação, a aba e a página ficam na URL. Mudar filtro volta à página 1.
- Google, Facebook, “esqueci a senha”, newsletter, Criadores, Aprenda, Diário da Cunhagem, atividade, ofertas, downloads e suporte abrem um diálogo acessível de indisponível. Nenhuma dessas ações conclui.
- As contagens da barra lateral vêm da API. Os números pintados nos frames (por exemplo Música 65) são ilustrativos.
- O export não trouxe fontes: o texto virou curva. A interface usa Manrope e os títulos de destaque usam Oswald.
- O catálogo reutiliza quatro artes (jaqueta verde, fones, casaco claro e moletom roxo). Os frames repetiam essas mesmas imagens.
- A faixa de preço vai de 0,02 a 12,30 ETH e só entra na URL ao clicar em Aplicar.

## Auditoria

Playwright cobre filtros e histórico, detalhe inexistente, conta e troca de usuário, favorito com falha, carrinho e cupom, compra até o recibo, recusa, clique duplo com timeout idempotente, perfil e carteiras, `nft.updated` no checkout, evento duplicado, evento antigo, queda de conexão e teclado. Os baselines visuais são início, detalhe, carrinho e pagamento, em 1440 e 390, na versão Própria. O `boot` da suíte liga `prefers-reduced-motion`, então o herói fica no primeiro destaque e a barra permanece vazia.

O Lighthouse 12.8.2 mede início e detalhe, mobile e desktop, três vezes, e grava a mediana de Performance, Acessibilidade, Best Practices, SEO, LCP, CLS e TBT. As metas são 90, 95, 95 e 90. A mediana em Node 20.18, em 10 de novembro de 2026, é anterior ao herói automático, ao vidro das obras raras e ao controle de versão:

| Página | Perfil | Performance | Acessibilidade | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 90 | 100 | 100 | 92 | 2922 ms | 0,027 | 47 ms |
| Início | desktop | 100 | 100 | 100 | 92 | 168 ms | 0,004 | 0 ms |
| Detalhe | mobile | 92 | 100 | 100 | 92 | 2693 ms | 0,029 | 21 ms |
| Detalhe | desktop | 100 | 100 | 100 | 92 | 148 ms | 0 | 0 ms |

O service worker do MSW não entrega o tempo de cada recurso, e a simulação do Lighthouse passa a tratar o grafo como se as requisições fossem em série. A auditoria usa `throttlingMethod: devtools`, com Slow 4G e CPU 4× no mobile e a rede de desktop no perfil largo. A capa do herói é pré-carregada. O catálogo, os diálogos e o restante do detalhe entram depois da primeira pintura; a capa da obra conhecida aparece enquanto o preço ainda vem da API. Manrope entra nos pesos 400 e 600, Oswald no peso 500. Imagem, fonte e função permanecem ligadas.
