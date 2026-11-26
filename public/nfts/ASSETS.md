# Assets (task 0003)

Origem: o Figma original esta inacessivel (sem permissao; limite do MCP atingido). Todos os arquivos foram recortados dos PNGs de referencia em `.claude/docs/referencias/png/` (desvio, NFR-15). Recortes reamostrados com Lanczos, WebP q80. Nomes estaveis, sem o titulo do NFT.

| Arquivo (`-card` 250 px / `-detail` 450 px de largura) | NFT | Origem do recorte | Resolucao nativa | Perda |
|---|---|---|---|---|
| portrait-01 | Emerald Ape | hero de `desktop-login.png`, so a parte nao coberta pelo modal | 315x422 | detalhe: ~1x; card ok; lado esquerdo cortado (orelha) |
| portrait-02 | Sage Nomad | card em `mobile-inicio.png` (4:5) | 155x159 | detalhe e card ampliados; baixa nitidez |
| portrait-03 | Neon Vessel | card em `desktop-login.png`, sem a etiqueta RARO | 234x227 | topo cortado; detalhe ampliado ~1,9x |
| portrait-04 | Cosmic Bloom | card em `desktop-login.png` (4:5) | 204x266 | detalhe ampliado ~2,2x |
| portrait-05 | Violet Nomad | card em `desktop-login.png` | 230x230 | detalhe ampliado ~2x |
| portrait-06 | Ivory Baron | idem | 230x230 | idem |
| portrait-07 | Golden Beat | idem | 230x230 | idem |
| portrait-08 | Golden Frequency | idem | 230x230 | idem |
| portrait-09 | Golden Signal | idem | 230x230 | idem; **duplicata byte a byte de portrait-05** (card e detail com o mesmo sha256: card `deed8b25...1ffe1`, detail `75218edc...1501`); nao e um recorte distinto |

Notas: os retratos 01, 03 e 07 sao a mesma arte (macaco de jaqueta verde) em enquadramentos distintos, assim como 02/04/08 (chapeu) e 05/09 (fones; arquivos identicos, ver tabela), alem do 06 (Ivory Baron, macaco preto), a 4a arte unica; o layout usa so 4 artes. A largura do detalhe (450) e ampliacao, nao ganho de informacao. Os cantos arredondados foram removidos por recorte interno (8-14 px).

Outros: `../icons/thank-you.png` (recorte de `desktop-confirmacao-de-pedido.png`, alfa extraida do fundo, 2x ampliado, cor #D28A4C); `../icons/google.svg` e `../icons/facebook.svg` (SVG simples redesenhados, nao exportados do Figma; Facebook so o "f"); `../favicon.svg` (criado, "K" em laranja; nao e do Figma); `../robots.txt` (Allow: /). Marca KURIO e texto, sem arquivo.
