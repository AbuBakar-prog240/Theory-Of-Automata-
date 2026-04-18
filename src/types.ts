export type AutomataModel = 'DFA' | 'NFA' | 'PDA' | 'TM'

export interface AutomataState {
  id: string
  label: string
  x: number
  y: number
  isStart?: boolean
  isAccept?: boolean
}

export interface TransitionRule {
  id: string
  from: string
  to: string
  input: string
  stackRead?: string
  stackWrite?: string
  tapeRead?: string
  tapeWrite?: string
  move?: 'L' | 'R' | 'S'
}

export interface AutomataDefinition {
  model: AutomataModel
  states: AutomataState[]
  transitions: TransitionRule[]
  alphabet: string[]
}

export interface SimulationStep {
  stateIds: string[]
  consumed: number
  input: string
  stack?: string[]
  tape?: string[]
  head?: number
  transitionId?: string
  note?: string
}

export interface SimulationResult {
  accepted: boolean
  halted: boolean
  steps: SimulationStep[]
  reason: string
}

export interface UISimulationConfig {
  maxSteps: number
}
