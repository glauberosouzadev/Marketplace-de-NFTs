import type { FailureSpec, Scenario } from './types'

const FAST = { kind: 'fixed', ms: 150 } as const
/** N das falhas "nas primeiras": maior que `retries + 1` (retries = 2), senão o erro nunca aparece. */
const FIRST_FAILURES = 4

const transient: FailureSpec = {
  kind: 'http',
  status: 503,
  code: 'TRANSIENT',
  message: 'Servico temporariamente indisponivel.',
}

const base = { seed: 20261128, latency: FAST, routes: {}, flows: {} }

export const SCENARIOS: readonly Scenario[] = [
  {
    ...base,
    id: 'default',
    name: 'Padrao',
    description: 'Latencia curta e sem falhas.',
  },
  {
    ...base,
    id: 'S-01',
    name: 'Sucesso e resultado vazio',
    description: 'Catalogo sem resultados.',
    flows: { catalog: 'empty' },
  },
  {
    ...base,
    id: 'S-02',
    name: 'Latencia variavel e respostas fora de ordem',
    description: 'Latencia variavel (seed fixa) na listagem e nos detalhes.',
    latency: { kind: 'variable', minMs: 100, maxMs: 1800 },
    routes: {
      'GET /nfts': { latency: { kind: 'variable', minMs: 100, maxMs: 2500 } },
      'GET /nfts/:id': { latency: { kind: 'variable', minMs: 100, maxMs: 2500 } },
    },
  },
  {
    ...base,
    id: 'S-03',
    name: 'Falha de conexao e HTTP 4xx/5xx',
    description: `503 nas ${FIRST_FAILURES} primeiras chamadas, conexao e timeout nas primeiras.`,
    routes: {
      'GET /nfts': { failure: transient, failTimes: FIRST_FAILURES },
      'GET /nfts/facets': { failure: { kind: 'offline' }, failTimes: FIRST_FAILURES },
      'GET /nfts/featured': { failure: { kind: 'timeout' }, failTimes: FIRST_FAILURES },
      'POST /quotes': {
        failure: { kind: 'http', status: 400, code: 'VALIDATION', message: 'Requisicao invalida.' },
        failTimes: 1,
      },
    },
  },
  {
    ...base,
    id: 'S-04',
    name: 'Sessao expirada e acesso nao autorizado',
    description: 'Sessao expira; rotas protegidas respondem 401/403.',
    flows: { session: 'expired' },
  },
  {
    ...base,
    id: 'S-05',
    name: 'Conflito de cadastro e validacao',
    description:
      'Sem efeitos extras: e-mail e usuario do seed geram conflito (EMAIL_TAKEN/USERNAME_TAKEN).',
  },
  {
    ...base,
    id: 'S-06',
    name: 'Cupom invalido ou expirado',
    description: 'Sem efeitos extras: cupons invalido e expirado vem do seed.',
  },
  {
    ...base,
    id: 'S-07',
    name: 'Preco alterado ou edicao esgotada',
    description: 'A cotacao detecta preco alterado e edicao esgotada durante a compra.',
    flows: { purchase: 'price-changed' },
  },
  {
    ...base,
    id: 'S-08',
    name: 'Timeout apos criar pedido',
    description:
      'O pedido e criado, a resposta estoura o timeout; reenvio com a mesma chave recupera.',
    routes: { 'POST /orders': { failure: { kind: 'timeout' }, failTimes: 1 } },
    flows: { order: 'timeout-after-create' },
  },
  {
    ...base,
    id: 'S-09',
    name: 'Pagamento confirmado e recusado',
    description: 'Liquidacao simulada confirma ou recusa o pagamento.',
    latency: { kind: 'fixed', ms: 400 },
    flows: { order: 'confirmed' },
  },
]

export const DEFAULT_SCENARIO_ID = 'default'

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
