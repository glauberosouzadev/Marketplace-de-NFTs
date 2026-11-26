import { DEFAULT_SCENARIO_ID, findScenario } from './definitions'
import { createEngine, type ScenarioEngine } from './engine'

let engine: ScenarioEngine | null = null

export function activateScenario(id: string): ScenarioEngine {
  const scenario = findScenario(id) ?? findScenario(DEFAULT_SCENARIO_ID)
  if (!scenario) throw new Error(`Cenario padrao '${DEFAULT_SCENARIO_ID}' nao definido`)
  engine = createEngine(scenario)
  return engine
}

export function getActiveEngine(): ScenarioEngine {
  return engine ?? activateScenario(DEFAULT_SCENARIO_ID)
}
