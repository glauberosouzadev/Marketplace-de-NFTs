import { clearPersisted, loadState, saveState } from './persist'
import { buildSeed } from './seed'
import type { DbState } from './types'

/** Banco simulado único (ADR 0001): REST e WS leem e escrevem aqui. */
let state: DbState | null = null

export function getDb(): DbState {
  if (!state) {
    state = loadState() ?? buildSeed()
    saveState(state)
  }
  return state
}

/** Aplica a mutação e persiste em `kurio-mock:*`. */
export function mutateDb<T>(mutation: (db: DbState) => T): T {
  const draft = structuredClone(getDb())
  const result = mutation(draft)
  state = draft
  saveState(draft)
  return result
}

/** Próxima versão de recurso: sempre estritamente maior que a atual (monotônica). */
export function nextVersion(current: number): number {
  return current + 1
}

/** Próximo id de evento, estável e único (contador persistido). */
export function nextEventId(): string {
  return mutateDb((db) => {
    db.meta.eventSeq += 1
    return `evt-${String(db.meta.eventSeq).padStart(6, '0')}`
  })
}

/** Restaura o seed e limpa `kurio-mock:*`. */
export function resetDb(): DbState {
  clearPersisted()
  state = buildSeed()
  return state
}
