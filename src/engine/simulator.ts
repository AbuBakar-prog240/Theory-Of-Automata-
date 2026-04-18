import type { AutomataDefinition, SimulationResult, SimulationStep, TransitionRule } from '../types'

const EPSILON = 'ε'

const getStartState = (def: AutomataDefinition) => def.states.find((s) => s.isStart)?.id
const isAccept = (def: AutomataDefinition, id: string) => !!def.states.find((s) => s.id === id)?.isAccept

const epsilonClosure = (def: AutomataDefinition, states: Set<string>): Set<string> => {
  const closure = new Set(states)
  let changed = true
  while (changed) {
    changed = false
    for (const t of def.transitions) {
      if ((t.input === EPSILON || t.input === '') && closure.has(t.from) && !closure.has(t.to)) {
        closure.add(t.to)
        changed = true
      }
    }
  }
  return closure
}

const runDFA = (def: AutomataDefinition, input: string): SimulationResult => {
  const start = getStartState(def)
  if (!start) return { accepted: false, halted: true, steps: [], reason: 'Missing start state' }
  let current = start
  const steps: SimulationStep[] = [{ stateIds: [current], consumed: 0, input }]

  for (let i = 0; i < input.length; i += 1) {
    const symbol = input[i]
    const tr = def.transitions.find((t) => t.from === current && t.input === symbol)
    if (!tr) {
      return { accepted: false, halted: true, steps, reason: `No transition for ${symbol} from ${current}` }
    }
    current = tr.to
    steps.push({ stateIds: [current], consumed: i + 1, input, transitionId: tr.id })
  }

  return {
    accepted: isAccept(def, current),
    halted: true,
    steps,
    reason: isAccept(def, current) ? 'String accepted' : 'Stopped in non-accept state',
  }
}

const runNFA = (def: AutomataDefinition, input: string): SimulationResult => {
  const start = getStartState(def)
  if (!start) return { accepted: false, halted: true, steps: [], reason: 'Missing start state' }

  let current = epsilonClosure(def, new Set([start]))
  const steps: SimulationStep[] = [{ stateIds: [...current], consumed: 0, input }]

  for (let i = 0; i < input.length; i += 1) {
    const symbol = input[i]
    const next = new Set<string>()
    for (const st of current) {
      for (const t of def.transitions) {
        if (t.from === st && t.input === symbol) next.add(t.to)
      }
    }
    current = epsilonClosure(def, next)
    steps.push({ stateIds: [...current], consumed: i + 1, input })
    if (current.size === 0) {
      return { accepted: false, halted: true, steps, reason: 'No active states remain' }
    }
  }

  const accepted = [...current].some((id) => isAccept(def, id))
  return { accepted, halted: true, steps, reason: accepted ? 'String accepted' : 'No active accept state' }
}

type PDAConfig = { state: string; index: number; stack: string[]; transitionId?: string }

const appliesPDA = (t: TransitionRule, symbol: string, top: string) => {
  const inputOk = t.input === symbol || t.input === EPSILON || t.input === ''
  const read = t.stackRead ?? EPSILON
  const stackOk = read === EPSILON || read === '' || read === top
  return inputOk && stackOk
}

const runPDA = (def: AutomataDefinition, input: string, maxSteps: number): SimulationResult => {
  const start = getStartState(def)
  if (!start) return { accepted: false, halted: true, steps: [], reason: 'Missing start state' }

  let frontier: PDAConfig[] = [{ state: start, index: 0, stack: ['$'] }]
  const steps: SimulationStep[] = [{ stateIds: [start], consumed: 0, input, stack: ['$'] }]

  for (let depth = 0; depth < maxSteps; depth += 1) {
    const next: PDAConfig[] = []
    for (const cfg of frontier) {
      const symbol = input[cfg.index] ?? EPSILON
      const top = cfg.stack[cfg.stack.length - 1] ?? EPSILON

      if (cfg.index === input.length && isAccept(def, cfg.state)) {
        steps.push({ stateIds: [cfg.state], consumed: cfg.index, input, stack: cfg.stack, note: 'Accepted by final state' })
        return { accepted: true, halted: true, steps, reason: 'String accepted' }
      }

      for (const t of def.transitions) {
        if (t.from !== cfg.state || !appliesPDA(t, symbol, top)) continue
        const stack = [...cfg.stack]
        const read = t.stackRead ?? EPSILON
        if (read !== EPSILON && read !== '') stack.pop()
        const write = t.stackWrite ?? EPSILON
        if (write !== EPSILON && write !== '') {
          for (const char of [...write].reverse()) stack.push(char)
        }
        next.push({
          state: t.to,
          index: t.input === EPSILON || t.input === '' ? cfg.index : cfg.index + 1,
          stack,
          transitionId: t.id,
        })
      }
    }

    if (!next.length) {
      return { accepted: false, halted: true, steps, reason: 'No PDA configuration can proceed' }
    }

    frontier = next.slice(0, 100)
    const first = frontier[0]
    steps.push({
      stateIds: frontier.map((f) => f.state),
      consumed: first.index,
      input,
      stack: first.stack,
      transitionId: first.transitionId,
    })
  }

  return { accepted: false, halted: false, steps, reason: 'Stopped due to max step limit' }
}

const runTM = (def: AutomataDefinition, input: string, maxSteps: number): SimulationResult => {
  const start = getStartState(def)
  if (!start) return { accepted: false, halted: true, steps: [], reason: 'Missing start state' }

  let state = start
  let head = 0
  const tape = [...input]
  if (tape.length === 0) tape.push('_')

  const steps: SimulationStep[] = [{ stateIds: [state], consumed: 0, input, tape: [...tape], head }]

  for (let i = 0; i < maxSteps; i += 1) {
    if (head < 0) {
      tape.unshift('_')
      head = 0
    }
    if (head >= tape.length) tape.push('_')

    const read = tape[head]
    const tr = def.transitions.find((t) => t.from === state && (t.tapeRead ?? t.input) === read)

    if (!tr) {
      const accepted = isAccept(def, state)
      return { accepted, halted: true, steps, reason: accepted ? 'Halted in accept state' : 'No valid TM transition' }
    }

    tape[head] = tr.tapeWrite ?? tr.input
    if (tr.move === 'L') head -= 1
    if (tr.move === 'R') head += 1
    state = tr.to

    steps.push({ stateIds: [state], consumed: i + 1, input, tape: [...tape], head, transitionId: tr.id })
  }

  return { accepted: false, halted: false, steps, reason: 'Stopped due to max step limit' }
}

export const simulateAutomata = (
  def: AutomataDefinition,
  input: string,
  maxSteps = 200,
): SimulationResult => {
  switch (def.model) {
    case 'DFA':
      return runDFA(def, input)
    case 'NFA':
      return runNFA(def, input)
    case 'PDA':
      return runPDA(def, input, maxSteps)
    case 'TM':
      return runTM(def, input, maxSteps)
    default:
      return { accepted: false, halted: true, steps: [], reason: 'Unsupported model' }
  }
}

