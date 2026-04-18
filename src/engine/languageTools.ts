import type { AutomataDefinition, TransitionRule } from '../types'

const EPS = 'ε'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const getStart = (def: AutomataDefinition) => def.states.find((s) => s.isStart)?.id ?? def.states[0]?.id ?? ''
const getAccepts = (def: AutomataDefinition) => new Set(def.states.filter((s) => s.isAccept).map((s) => s.id))
const getAlphabet = (def: AutomataDefinition) => [...new Set(def.alphabet.filter((a) => a !== EPS && a !== 'e' && a !== ''))]

const epsilonClosure = (def: AutomataDefinition, states: Set<string>) => {
  const closure = new Set(states)
  let changed = true
  while (changed) {
    changed = false
    for (const tr of def.transitions) {
      if ((tr.input === EPS || tr.input === 'e' || tr.input === '') && closure.has(tr.from) && !closure.has(tr.to)) {
        closure.add(tr.to)
        changed = true
      }
    }
  }
  return closure
}

const move = (def: AutomataDefinition, states: Set<string>, symbol: string) => {
  const out = new Set<string>()
  for (const st of states) {
    for (const tr of def.transitions) {
      if (tr.from === st && tr.input === symbol) out.add(tr.to)
    }
  }
  return out
}

export const regexToNFA = (regex: string): AutomataDefinition => {
  let idx = 0
  const mkState = () => `r${idx++}`
  type Frag = { start: string; end: string; transitions: TransitionRule[]; states: string[] }
  const isSymbol = (c: string) => !['|', '*', '(', ')', '.'].includes(c)
  const withConcat = (() => {
    const out: string[] = []
    const s = regex.replace(/\s+/g, '')
    for (let i = 0; i < s.length; i += 1) {
      const a = s[i]
      const b = s[i + 1]
      out.push(a)
      if (!b) continue
      if ((isSymbol(a) || a === ')' || a === '*') && (isSymbol(b) || b === '(')) out.push('.')
    }
    return out.join('')
  })()

  const prec: Record<string, number> = { '|': 1, '.': 2, '*': 3 }
  const output: string[] = []
  const stack: string[] = []
  for (const c of withConcat) {
    if (isSymbol(c)) output.push(c)
    else if (c === '(') stack.push(c)
    else if (c === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop()!)
      stack.pop()
    } else {
      while (stack.length && stack[stack.length - 1] !== '(' && prec[stack[stack.length - 1]] >= prec[c]) output.push(stack.pop()!)
      stack.push(c)
    }
  }
  while (stack.length) output.push(stack.pop()!)

  const frags: Frag[] = []
  for (const token of output) {
    if (isSymbol(token)) {
      const s = mkState()
      const e = mkState()
      frags.push({
        start: s,
        end: e,
        states: [s, e],
        transitions: [{ id: `rt-${s}-${e}`, from: s, to: e, input: token }],
      })
    } else if (token === '.') {
      const b = frags.pop()!
      const a = frags.pop()!
      frags.push({
        start: a.start,
        end: b.end,
        states: [...a.states, ...b.states],
        transitions: [...a.transitions, ...b.transitions, { id: `rt-${a.end}-${b.start}`, from: a.end, to: b.start, input: EPS }],
      })
    } else if (token === '|') {
      const b = frags.pop()!
      const a = frags.pop()!
      const s = mkState()
      const e = mkState()
      frags.push({
        start: s,
        end: e,
        states: [s, e, ...a.states, ...b.states],
        transitions: [
          ...a.transitions,
          ...b.transitions,
          { id: `rt-${s}-${a.start}`, from: s, to: a.start, input: EPS },
          { id: `rt-${s}-${b.start}`, from: s, to: b.start, input: EPS },
          { id: `rt-${a.end}-${e}`, from: a.end, to: e, input: EPS },
          { id: `rt-${b.end}-${e}`, from: b.end, to: e, input: EPS },
        ],
      })
    } else if (token === '*') {
      const a = frags.pop()!
      const s = mkState()
      const e = mkState()
      frags.push({
        start: s,
        end: e,
        states: [s, e, ...a.states],
        transitions: [
          ...a.transitions,
          { id: `rt-${s}-${a.start}`, from: s, to: a.start, input: EPS },
          { id: `rt-${s}-${e}`, from: s, to: e, input: EPS },
          { id: `rt-${a.end}-${a.start}`, from: a.end, to: a.start, input: EPS },
          { id: `rt-${a.end}-${e}`, from: a.end, to: e, input: EPS },
        ],
      })
    }
  }
  const final = frags.pop()
  if (!final) return { model: 'NFA', alphabet: ['a', 'b', EPS], states: [], transitions: [] }

  return {
    model: 'NFA',
    alphabet: [...new Set(withConcat.split('').filter((c) => isSymbol(c)).concat([EPS]))],
    states: final.states.map((id, i) => ({
      id,
      label: id,
      x: 120 + i * 90,
      y: i % 2 === 0 ? 120 : 220,
      isStart: id === final.start,
      isAccept: id === final.end,
    })),
    transitions: final.transitions.map((t, i) => ({ ...t, id: `r${i}` })),
  }
}

export const nfaToDfa = (def: AutomataDefinition): AutomataDefinition => {
  const alphabet = getAlphabet(def)
  const startSet = epsilonClosure(def, new Set([getStart(def)]))
  const key = (s: Set<string>) => [...s].sort().join('|')
  const queue: Set<string>[] = [startSet]
  const seen = new Map<string, Set<string>>([[key(startSet), startSet]])
  const accepts = getAccepts(def)
  const transitions: TransitionRule[] = []
  while (queue.length) {
    const cur = queue.shift()!
    const curKey = key(cur)
    for (const sym of alphabet) {
      const nxt = epsilonClosure(def, move(def, cur, sym))
      const nxtKey = key(nxt)
      if (!seen.has(nxtKey)) {
        seen.set(nxtKey, nxt)
        queue.push(nxt)
      }
      transitions.push({ id: `d-${curKey}-${sym}`, from: curKey || '∅', to: nxtKey || '∅', input: sym })
    }
  }
  const states = [...seen.keys()].map((id, i) => ({
    id: id || '∅',
    label: id || '∅',
    x: 100 + i * 120,
    y: 140,
    isStart: id === key(startSet),
    isAccept: [...(seen.get(id) ?? new Set())].some((s) => accepts.has(s)),
  }))
  return { model: 'DFA', alphabet, states, transitions }
}

export const minimizeDFA = (def: AutomataDefinition): AutomataDefinition => {
  const alphabet = getAlphabet(def)
  const states = def.states.map((s) => s.id)
  const accept = new Set(def.states.filter((s) => s.isAccept).map((s) => s.id))
  let partitions: Set<string>[] = [new Set(states.filter((s) => !accept.has(s))), new Set(states.filter((s) => accept.has(s)))].filter((s) => s.size > 0)
  const trans = (st: string, sym: string) => def.transitions.find((t) => t.from === st && t.input === sym)?.to ?? ''
  let changed = true
  while (changed) {
    changed = false
    const nextParts: Set<string>[] = []
    for (const part of partitions) {
      const groups = new Map<string, Set<string>>()
      for (const st of part) {
        const sig = alphabet.map((sym) => partitions.findIndex((p) => p.has(trans(st, sym)))).join(',')
        if (!groups.has(sig)) groups.set(sig, new Set())
        groups.get(sig)!.add(st)
      }
      if (groups.size > 1) changed = true
      nextParts.push(...groups.values())
    }
    partitions = nextParts
  }
  const rep = (s: string) => partitions.findIndex((p) => p.has(s))
  const newStates = partitions.map((p, i) => {
    const arr = [...p]
    return {
      id: `m${i}`,
      label: `m${i}{${arr.join(',')}}`,
      x: 100 + i * 120,
      y: 120,
      isStart: p.has(getStart(def)),
      isAccept: arr.some((s) => accept.has(s)),
    }
  })
  const newTransitions: TransitionRule[] = []
  for (let i = 0; i < partitions.length; i += 1) {
    const sample = [...partitions[i]][0]
    for (const sym of alphabet) {
      const to = rep(trans(sample, sym))
      newTransitions.push({ id: `mt-${i}-${sym}`, from: `m${i}`, to: `m${to}`, input: sym })
    }
  }
  return { model: 'DFA', alphabet, states: newStates, transitions: newTransitions }
}

const renameWithPrefix = (def: AutomataDefinition, prefix: string): AutomataDefinition => ({
  ...clone(def),
  states: def.states.map((s) => ({ ...s, id: `${prefix}${s.id}`, label: `${prefix}${s.label}` })),
  transitions: def.transitions.map((t) => ({ ...t, from: `${prefix}${t.from}`, to: `${prefix}${t.to}` })),
})

/** Joins two DFA state ids for product construction. Must not appear inside a single state's id (subset DFAs use single "|"). */
const DFA_PRODUCT_SEP = '||'

const parseProductStateId = (id: string): [string, string] => {
  const idx = id.indexOf(DFA_PRODUCT_SEP)
  if (idx === -1) return [id, '']
  return [id.slice(0, idx), id.slice(idx + DFA_PRODUCT_SEP.length)]
}

export const unionDFA = (a: AutomataDefinition, b: AutomataDefinition): AutomataDefinition => {
  const dfaA = a.model === 'DFA' ? a : nfaToDfa(a)
  const dfaB = b.model === 'DFA' ? b : nfaToDfa(b)
  const alphabet = [...new Set([...getAlphabet(dfaA), ...getAlphabet(dfaB)])]
  const start = `${getStart(dfaA)}${DFA_PRODUCT_SEP}${getStart(dfaB)}`
  const queue = [start]
  const seen = new Set([start])
  const transitions: TransitionRule[] = []
  const states: AutomataDefinition['states'] = []
  const isAcceptA = getAccepts(dfaA)
  const isAcceptB = getAccepts(dfaB)
  while (queue.length) {
    const cur = queue.shift()!
    const [sa, sb] = parseProductStateId(cur)
    states.push({ id: cur, label: cur, x: 100 + states.length * 100, y: 120, isStart: cur === start, isAccept: isAcceptA.has(sa) || isAcceptB.has(sb) })
    for (const sym of alphabet) {
      const ta = dfaA.transitions.find((t) => t.from === sa && t.input === sym)?.to ?? sa
      const tb = dfaB.transitions.find((t) => t.from === sb && t.input === sym)?.to ?? sb
      const nxt = `${ta}${DFA_PRODUCT_SEP}${tb}`
      transitions.push({ id: `u-${cur}-${sym}`, from: cur, to: nxt, input: sym })
      if (!seen.has(nxt)) {
        seen.add(nxt)
        queue.push(nxt)
      }
    }
  }
  return { model: 'DFA', alphabet, states, transitions }
}

export const intersectionDFA = (a: AutomataDefinition, b: AutomataDefinition): AutomataDefinition => {
  const union = unionDFA(a, b)
  const dfaA = a.model === 'DFA' ? a : nfaToDfa(a)
  const dfaB = b.model === 'DFA' ? b : nfaToDfa(b)
  const accA = getAccepts(dfaA)
  const accB = getAccepts(dfaB)
  return {
    ...union,
    states: union.states.map((s) => {
      const [x, y] = parseProductStateId(s.id)
      return { ...s, isAccept: accA.has(x) && accB.has(y) }
    }),
  }
}

export const complementDFA = (a: AutomataDefinition): AutomataDefinition => {
  const dfa = a.model === 'DFA' ? clone(a) : nfaToDfa(a)
  return { ...dfa, states: dfa.states.map((s) => ({ ...s, isAccept: !s.isAccept })) }
}

export const concatenateNFA = (a: AutomataDefinition, b: AutomataDefinition): AutomataDefinition => {
  const left = renameWithPrefix(a.model === 'NFA' ? a : nfaToDfa(a), 'A_')
  const right = renameWithPrefix(b.model === 'NFA' ? b : nfaToDfa(b), 'B_')
  const accLeft = left.states.filter((s) => s.isAccept).map((s) => s.id)
  const startRight = getStart(right)
  const epsTransitions = accLeft.map((id, i) => ({ id: `c-eps-${i}`, from: id, to: startRight, input: EPS }))
  return {
    model: 'NFA',
    alphabet: [...new Set([...getAlphabet(left), ...getAlphabet(right), EPS])],
    states: [
      ...left.states.map((s) => ({ ...s, isAccept: false })),
      ...right.states,
    ],
    transitions: [...left.transitions, ...right.transitions, ...epsTransitions],
  }
}

export const kleeneStarNFA = (a: AutomataDefinition): AutomataDefinition => {
  const base = renameWithPrefix(a.model === 'NFA' ? a : nfaToDfa(a), 'K_')
  const start = 'K_START'
  const end = 'K_END'
  const startBase = getStart(base)
  const accBase = base.states.filter((s) => s.isAccept).map((s) => s.id)
  return {
    model: 'NFA',
    alphabet: [...new Set([...getAlphabet(base), EPS])],
    states: [
      { id: start, label: start, x: 80, y: 120, isStart: true },
      ...base.states.map((s) => ({ ...s, isStart: false, isAccept: false })),
      { id: end, label: end, x: 460, y: 120, isAccept: true },
    ],
    transitions: [
      ...base.transitions,
      { id: 'ks-0', from: start, to: end, input: EPS },
      { id: 'ks-1', from: start, to: startBase, input: EPS },
      ...accBase.map((id, i) => ({ id: `ks-a-${i}`, from: id, to: end, input: EPS })),
      ...accBase.map((id, i) => ({ id: `ks-b-${i}`, from: id, to: startBase, input: EPS })),
    ],
  }
}

export const describeLanguage = (def: AutomataDefinition): string => {
  if (def.model === 'DFA' && def.states.length === 2 && def.alphabet.join(',') === '0,1') {
    const edges = new Set(def.transitions.map((t) => `${t.from}-${t.input}-${t.to}`))
    if (edges.has('q0-1-q1') && edges.has('q1-1-q1')) return 'Likely language: binary strings ending with 1.'
  }
  if (def.model === 'NFA' && def.transitions.some((t) => t.input === 'ε' || t.input === 'e')) return 'NFA with epsilon transitions.'
  if (def.model === 'PDA') return 'Context-free language recognized by a pushdown automaton.'
  if (def.model === 'TM') return 'Recursively enumerable language by a Turing machine.'
  return `Automaton with ${def.states.length} states and alphabet {${def.alphabet.join(', ')}}.`
}

