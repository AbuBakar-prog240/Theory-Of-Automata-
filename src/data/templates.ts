import type { AutomataDefinition, AutomataModel } from '../types'

const alphabetForEmpty = (model: AutomataModel): string[] => {
  switch (model) {
    case 'DFA':
      return ['0', '1']
    case 'TM':
      return ['0', '1', '_']
    case 'NFA':
    case 'PDA':
      return ['a', 'b', 'ε']
    default:
      return ['a', 'b']
  }
}

const baseForModel = (model: AutomataModel): AutomataDefinition => ({
  model,
  alphabet: alphabetForEmpty(model),
  states: [
    { id: 'q0', label: 'q0', x: 80, y: 120, isStart: true },
    { id: 'q1', label: 'q1', x: 320, y: 120, isAccept: true },
  ],
  transitions: [
    {
      id: 't0',
      from: 'q0',
      to: 'q1',
      input: model === 'TM' ? '_' : model === 'DFA' ? '0' : 'a',
      stackRead: model === 'PDA' ? '$' : undefined,
      stackWrite: model === 'PDA' ? '$' : undefined,
      tapeRead: model === 'TM' ? '_' : undefined,
      tapeWrite: model === 'TM' ? '_' : undefined,
      move: model === 'TM' ? 'S' : undefined,
    },
  ],
})

export const templates: Record<string, AutomataDefinition> = {
  'DFA - Ends with 1': {
    model: 'DFA',
    alphabet: ['0', '1'],
    states: [
      { id: 'q0', label: 'q0', x: 80, y: 120, isStart: true },
      { id: 'q1', label: 'q1', x: 320, y: 120, isAccept: true },
    ],
    transitions: [
      { id: 'd0', from: 'q0', to: 'q0', input: '0' },
      { id: 'd1', from: 'q0', to: 'q1', input: '1' },
      { id: 'd2', from: 'q1', to: 'q0', input: '0' },
      { id: 'd3', from: 'q1', to: 'q1', input: '1' },
    ],
  },
  'NFA - Contains ab': {
    model: 'NFA',
    alphabet: ['a', 'b', 'ε'],
    states: [
      { id: 'q0', label: 'q0', x: 40, y: 130, isStart: true },
      { id: 'q1', label: 'q1', x: 260, y: 70 },
      { id: 'q2', label: 'q2', x: 260, y: 200, isAccept: true },
    ],
    transitions: [
      { id: 'n0', from: 'q0', to: 'q0', input: 'a' },
      { id: 'n1', from: 'q0', to: 'q0', input: 'b' },
      { id: 'n2', from: 'q0', to: 'q1', input: 'a' },
      { id: 'n3', from: 'q1', to: 'q2', input: 'b' },
      { id: 'n4', from: 'q2', to: 'q2', input: 'a' },
      { id: 'n5', from: 'q2', to: 'q2', input: 'b' },
    ],
  },
  'PDA - a^n b^n': {
    model: 'PDA',
    alphabet: ['a', 'b', 'ε'],
    states: [
      { id: 'q0', label: 'q0', x: 80, y: 120, isStart: true },
      { id: 'q1', label: 'q1', x: 260, y: 120 },
      { id: 'q2', label: 'q2', x: 440, y: 120, isAccept: true },
    ],
    transitions: [
      { id: 'p0', from: 'q0', to: 'q0', input: 'a', stackRead: 'e', stackWrite: 'A' },
      { id: 'p1', from: 'q0', to: 'q1', input: 'b', stackRead: 'A', stackWrite: 'e' },
      { id: 'p2', from: 'q1', to: 'q1', input: 'b', stackRead: 'A', stackWrite: 'e' },
      { id: 'p3', from: 'q1', to: 'q2', input: 'e', stackRead: '$', stackWrite: '$' },
    ],
  },
  'PDA - Balanced Parentheses': {
    model: 'PDA',
    alphabet: ['(', ')', 'ε'],
    states: [
      { id: 'q0', label: 'q0', x: 100, y: 120, isStart: true },
      { id: 'q1', label: 'q1', x: 300, y: 120 },
      { id: 'q2', label: 'q2', x: 500, y: 120, isAccept: true },
    ],
    transitions: [
      { id: 'bp0', from: 'q0', to: 'q1', input: 'ε', stackRead: 'ε', stackWrite: '$' },
      { id: 'bp1', from: 'q1', to: 'q1', input: '(', stackRead: 'ε', stackWrite: '(' },
      { id: 'bp2', from: 'q1', to: 'q1', input: ')', stackRead: '(', stackWrite: 'ε' },
      { id: 'bp3', from: 'q1', to: 'q2', input: 'ε', stackRead: '$', stackWrite: '$' },
    ],
  },
  'TM - Replace 1 with X': {
    model: 'TM',
    alphabet: ['0', '1', 'X', '_'],
    states: [
      { id: 'q0', label: 'q0', x: 80, y: 120, isStart: true },
      { id: 'qa', label: 'qa', x: 320, y: 120, isAccept: true },
    ],
    transitions: [
      { id: 'm0', from: 'q0', to: 'q0', input: '0', tapeRead: '0', tapeWrite: '0', move: 'R' },
      { id: 'm1', from: 'q0', to: 'q0', input: '1', tapeRead: '1', tapeWrite: 'X', move: 'R' },
      { id: 'm2', from: 'q0', to: 'qa', input: '_', tapeRead: '_', tapeWrite: '_', move: 'S' },
    ],
  },
}

export const createEmptyDefinition = (model: AutomataModel): AutomataDefinition => baseForModel(model)

