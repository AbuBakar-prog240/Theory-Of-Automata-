import { Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import dagre from 'dagre'
import { AutomataCanvas } from './components/AutomataCanvas'
import { Sidebar } from './components/Sidebar'
import { SimulationPanel } from './components/SimulationPanel'
import { TransitionTable } from './components/TransitionTable'
import { createEmptyDefinition, templates } from './data/templates'
import {
  complementDFA,
  concatenateNFA,
  describeLanguage,
  intersectionDFA,
  kleeneStarNFA,
  minimizeDFA,
  nfaToDfa,
  regexToNFA,
  unionDFA,
} from './engine/languageTools'
import { simulateAutomata } from './engine/simulator'
import { useAutomataStore } from './store/automataStore'
import { useTheme } from './theme/ThemeContext'
import { downloadJSON, downloadTextFile, exportCanvasAsPNG, readJSONFile } from './utils/serialization'
import { formatAlphabetLabel, parseAlphabet, validateAlphabetSymbols } from './utils/alphabet'
import type { AutomataDefinition, AutomataModel, SimulationResult, TransitionRule } from './types'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const dfaSymbols = (alphabet: string[]) => alphabet.filter((symbol) => symbol !== 'e' && symbol !== 'ε' && symbol !== '')

type DFAAnalysis = {
  issues: string[]
  missingByState: Record<string, string[]>
  isComplete: boolean
}

const analyzeDFA = (def: AutomataDefinition): DFAAnalysis => {
  if (def.model !== 'DFA') return { issues: [], missingByState: {}, isComplete: true }
  const issues: string[] = []
  const missingByState: Record<string, string[]> = {}
  const symbols = dfaSymbols(def.alphabet)

  if (symbols.length === 0) issues.push('Alphabet is empty. Please define at least one symbol.')

  for (const transition of def.transitions) {
    if (!symbols.includes(transition.input)) {
      issues.push(`Invalid transition symbol "${transition.input}" on ${transition.from} -> ${transition.to}`)
    }
  }

  for (const state of def.states) {
    missingByState[state.id] = []
    for (const symbol of symbols) {
      const count = def.transitions.filter((transition) => transition.from === state.id && transition.input === symbol).length
      if (count === 0) {
        issues.push(`Missing DFA transition from ${state.id} on "${symbol}"`)
        missingByState[state.id].push(symbol)
      }
      if (count > 1) issues.push(`Non-deterministic DFA transitions from ${state.id} on "${symbol}"`)
    }
  }

  return {
    issues,
    missingByState,
    isComplete: issues.length === 0,
  }
}

const autoLayoutDefinition = (def: AutomataDefinition): AutomataDefinition => {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 65, ranksep: 90, marginx: 30, marginy: 20 })

  for (const state of def.states) {
    graph.setNode(state.id, { width: 96, height: 96 })
  }
  for (const transition of def.transitions) {
    graph.setEdge(transition.from, transition.to)
  }

  dagre.layout(graph)

  return {
    ...def,
    states: def.states.map((state) => {
      const node = graph.node(state.id)
      if (!node) return state
      return { ...state, x: node.x - 48, y: node.y - 48 }
    }),
  }
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const { definition, setDefinition } = useAutomataStore()
  const [alphabetInput, setAlphabetInput] = useState(definition.alphabet.join(','))
  const [regexInput, setRegexInput] = useState('(a|b)*abb')
  const [selectedOperation, setSelectedOperation] = useState('union')
  const [selectedOperandTemplate, setSelectedOperandTemplate] = useState(Object.keys(templates)[0] ?? '')
  const [conversionSteps, setConversionSteps] = useState<string[]>([])
  const [undoStack, setUndoStack] = useState<AutomataDefinition[]>([])
  const [redoStack, setRedoStack] = useState<AutomataDefinition[]>([])
  const [input, setInput] = useState('1011')
  const [batchInput, setBatchInput] = useState('1011\n100\n11')
  const [batchResults, setBatchResults] = useState<Array<{ input: string; accepted: boolean; reason: string; simulation: SimulationResult }>>([])
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(-1)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string>('')
  const [alphabetError, setAlphabetError] = useState<string>('')
  const [transitionNotice, setTransitionNotice] = useState<string | null>(null)
  const [flashTransitionId, setFlashTransitionId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noticeClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pulseTransition = (id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current)
    setFlashTransitionId(id)
    flashClearRef.current = setTimeout(() => {
      setFlashTransitionId(null)
      flashClearRef.current = null
    }, 2000)
  }

  const showTransitionNotice = (message: string) => {
    if (noticeClearRef.current) clearTimeout(noticeClearRef.current)
    setTransitionNotice(message)
    noticeClearRef.current = setTimeout(() => {
      setTransitionNotice(null)
      noticeClearRef.current = null
    }, 2600)
  }

  useEffect(
    () => () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current)
      if (noticeClearRef.current) clearTimeout(noticeClearRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!isPlaying || !result) return
    const timer = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= result.steps.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 700)
    return () => clearInterval(timer)
  }, [isPlaying, result])

  const currentStep = result?.steps[stepIndex]
  const isSymbolAllowed = useCallback(
    (_model: AutomataModel, symbol: string, alphabet: string[]) => alphabet.includes(symbol),
    [],
  )

  const applyDefinitionUpdate = (updater: (prev: AutomataDefinition) => AutomataDefinition) => {
    setDefinition((prev) => {
      const next = updater(prev)
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev
      setUndoStack((stack) => [...stack, clone(prev)])
      setRedoStack([])
      return next
    })
  }

  const validateDefinition = (def: AutomataDefinition): string | null => {
    const startStates = def.states.filter((s) => s.isStart)
    if (startStates.length === 0) return 'Please define one start state'
    if (startStates.length > 1) return 'Only one start state is allowed'
    if (!def.states.some((s) => s.isAccept)) return 'Please define at least one accept state'
    if (def.model === 'DFA') return analyzeDFA(def).issues[0] ?? null
    const invalidTransition = def.transitions.find((transition) => !isSymbolAllowed(def.model, transition.input, def.alphabet))
    if (invalidTransition) return `Invalid symbol "${invalidTransition.input}" in transition ${invalidTransition.from} -> ${invalidTransition.to}`
    return null
  }

  const run = () => {
    const validation = validateDefinition(definition)
    if (validation) {
      setError(validation)
      setResult(null)
      return
    }
    setError('')
    const simulation = simulateAutomata(definition, input, 300)
    setResult(simulation)
    setBatchResults([])
    setSelectedBatchIndex(-1)
    setStepIndex(0)
    setIsPlaying(false)
  }

  const runBatch = () => {
    const validation = validateDefinition(definition)
    if (validation) {
      setError(validation)
      setBatchResults([])
      return
    }
    const entries = batchInput
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
    if (!entries.length) {
      setBatchResults([])
      return
    }
    setError('')
    const results = entries.map((entry) => {
      const simulation = simulateAutomata(definition, entry, 300)
      return { input: entry, accepted: simulation.accepted, reason: simulation.reason, simulation }
    })
    setBatchResults(results)
    setSelectedBatchIndex(-1)
    setResult(null)
    setStepIndex(0)
    setIsPlaying(false)
  }

  const nextStep = () => {
    if (!result) return
    setStepIndex((idx) => Math.min(idx + 1, result.steps.length - 1))
  }

  const reset = () => {
    setIsPlaying(false)
    setResult(null)
    setStepIndex(0)
    setBatchResults([])
    setSelectedBatchIndex(-1)
  }

  const addState = () => {
    applyDefinitionUpdate((prev) => {
      const nextId = `q${prev.states.length}`
      return autoLayoutDefinition({
        ...prev,
        states: [
          ...prev.states,
          { id: nextId, label: nextId, x: 100 + prev.states.length * 90, y: 220, isStart: false, isAccept: false },
        ],
      })
    })
  }

  const deleteState = () => {
    applyDefinitionUpdate((prev) => {
      if (prev.states.length <= 1) return prev
      const remove = prev.states[prev.states.length - 1].id
      return {
        ...prev,
        states: prev.states.slice(0, -1),
        transitions: prev.transitions.filter((t) => t.from !== remove && t.to !== remove),
      }
    })
  }

  const onModelChange = (model: AutomataModel) => {
    applyDefinitionUpdate(() => {
      const next = autoLayoutDefinition(createEmptyDefinition(model))
      setAlphabetInput(next.alphabet.join(','))
      setAlphabetError('')
      return next
    })
    reset()
  }

  const onAlphabetChange = (value: string) => {
    setAlphabetInput(value)
    const parsed = parseAlphabet(value)
    const validationError = validateAlphabetSymbols(parsed, definition.model)
    if (validationError) {
      setAlphabetError(validationError)
      return
    }
    setAlphabetError('')
    applyDefinitionUpdate((prev) => ({
      ...prev,
      alphabet: parsed,
      transitions: prev.transitions.filter((t) => parsed.includes(t.input)),
    }))
  }

  const onStateMove = (id: string, x: number, y: number) => {
    applyDefinitionUpdate((prev) => ({
      ...prev,
      states: prev.states.map((s) => (s.id === id ? { ...s, x, y } : s)),
    }))
  }

  const addTransitionDefinition = (from: string, to: string, inputValue: string) => {
    const inputSymbol = inputValue.trim()
    if (!inputSymbol) return

    if (!isSymbolAllowed(definition.model, inputSymbol, definition.alphabet)) {
      setError(
        `Symbol "${inputSymbol}" is not in the alphabet. Σ = ${formatAlphabetLabel(definition.alphabet)}. Add it under Alphabet first.`,
      )
      return
    }

    if (definition.model === 'DFA') {
      const existing = definition.transitions.find((t) => t.from === from && t.input === inputSymbol)
      if (existing) {
        if (existing.to === to) {
          setError('')
          pulseTransition(existing.id)
          showTransitionNotice('That transition is already defined.')
          return
        }
        const ok = window.confirm(
          `A transition on "${inputSymbol}" already goes from ${from} to ${existing.to}. Change the target state to ${to}?`,
        )
        if (!ok) {
          setError('Update cancelled.')
          return
        }
        applyDefinitionUpdate((prev) => ({
          ...prev,
          transitions: prev.transitions.map((t) => (t.id === existing.id ? { ...t, to } : t)),
        }))
        pulseTransition(existing.id)
        setError('')
        showTransitionNotice(`Updated: ${from} —${inputSymbol}→ ${to}`)
        return
      }
    } else if (
      definition.transitions.some((t) => t.from === from && t.to === to && t.input === inputSymbol)
    ) {
      setError(`Duplicate transition: ${from} → ${to} on "${inputSymbol}".`)
      return
    }

    const newId = `t${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    applyDefinitionUpdate((prev) =>
      autoLayoutDefinition({
        ...prev,
        transitions: [
          ...prev.transitions,
          {
            id: newId,
            from,
            to,
            input: prev.model === 'TM' ? '_' : inputSymbol,
            stackRead: prev.model === 'PDA' ? 'e' : undefined,
            stackWrite: prev.model === 'PDA' ? 'e' : undefined,
            tapeRead: prev.model === 'TM' ? '_' : undefined,
            tapeWrite: prev.model === 'TM' ? '_' : undefined,
            move: prev.model === 'TM' ? 'S' : undefined,
          },
        ],
      }),
    )
    pulseTransition(newId)
    setError('')
    showTransitionNotice(`Transition added: ${from} —${inputSymbol}→ ${to}`)
  }

  const onCreateTransitionsFromCanvas = (from: string, to: string, rawSymbols: string): string | null => {
    const symbols = parseAlphabet(rawSymbols)
    if (symbols.length === 0) return 'Please enter at least one symbol.'
    if (definition.model === 'DFA' && symbols.length > 1) {
      return 'DFA: enter one symbol per connection (for example 0 or 1, not "0,1"). Use another connection for the other symbol.'
    }

    for (const symbol of symbols) {
      const inputSymbol = symbol.trim()
      if (!isSymbolAllowed(definition.model, inputSymbol, definition.alphabet)) {
        return `Symbol "${inputSymbol}" is not in the alphabet. Σ = ${formatAlphabetLabel(definition.alphabet)}. Add it under Alphabet first.`
      }
    }

    if (definition.model === 'DFA') {
      const inputSymbol = symbols[0]!.trim()
      const existing = definition.transitions.find((t) => t.from === from && t.input === inputSymbol)
      if (existing) {
        if (existing.to === to) {
          pulseTransition(existing.id)
          showTransitionNotice('That transition is already defined.')
          setError('')
          return null
        }
        const ok = window.confirm(
          `A transition on "${inputSymbol}" already goes from ${from} to ${existing.to}. Change the target state to ${to}?`,
        )
        if (!ok) return 'Update cancelled.'
        applyDefinitionUpdate((prev) => ({
          ...prev,
          transitions: prev.transitions.map((t) => (t.id === existing.id ? { ...t, to } : t)),
        }))
        pulseTransition(existing.id)
        setError('')
        showTransitionNotice(`Updated: ${from} —${inputSymbol}→ ${to}`)
        return null
      }

      const newId = `t${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      applyDefinitionUpdate((prev) =>
        autoLayoutDefinition({
          ...prev,
          transitions: [...prev.transitions, { id: newId, from, to, input: inputSymbol }],
        }),
      )
      pulseTransition(newId)
      setError('')
      showTransitionNotice(`Transition added: ${from} —${inputSymbol}→ ${to}`)
      return null
    }

    const toAdd = symbols.filter(
      (symbol) =>
        !definition.transitions.some(
          (t) => t.from === from && t.to === to && t.input === symbol.trim(),
        ),
    )
    if (toAdd.length === 0) {
      return `These transitions already exist for ${from} → ${to}: ${symbols.join(', ')}.`
    }

    const newTransitions: TransitionRule[] = toAdd.map((symbol, idx) => ({
      id: `t${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
      from,
      to,
      input: symbol.trim(),
      stackRead: definition.model === 'PDA' ? 'e' : undefined,
      stackWrite: definition.model === 'PDA' ? 'e' : undefined,
      tapeRead: definition.model === 'TM' ? '_' : undefined,
      tapeWrite: definition.model === 'TM' ? '_' : undefined,
      move: definition.model === 'TM' ? 'S' : undefined,
    }))

    applyDefinitionUpdate((prev) =>
      autoLayoutDefinition({
        ...prev,
        transitions: [...prev.transitions, ...newTransitions],
      }),
    )
    pulseTransition(newTransitions[newTransitions.length - 1]!.id)
    setError('')
    showTransitionNotice(
      toAdd.length === symbols.length
        ? `Added ${toAdd.length} transition(s) for ${from} → ${to}.`
        : `Added ${toAdd.length} new transition(s); skipped symbols that were already present.`,
    )
    return null
  }

  const onEditMergedTransition = useCallback(
    (from: string, to: string) => {
      const group = definition.transitions.filter((transition) => transition.from === from && transition.to === to)
      if (group.length === 0) return
      const currentSymbols = [...new Set(group.map((transition) => transition.input))]
      const promptValue = currentSymbols.join(',')
      const userValue = window.prompt('Edit transition symbols (comma separated):', promptValue)
      if (userValue === null) return

      const desiredSymbols = parseAlphabet(userValue)
      if (desiredSymbols.length === 0) {
        setError('At least one symbol is required for this transition edge.')
        return
      }

      applyDefinitionUpdate((prev) => {
        const allowedSymbols = [...new Set(desiredSymbols.filter((symbol) => isSymbolAllowed(prev.model, symbol, prev.alphabet)))]
        if (allowedSymbols.length !== desiredSymbols.length) {
          setError(`Some symbols are not in the alphabet. Σ = ${formatAlphabetLabel(prev.alphabet)}.`)
          return prev
        }

        if (prev.model === 'DFA' && allowedSymbols.length > 1) {
          setError('DFA edge can only have one symbol per source state and symbol pair.')
          return prev
        }

        if (prev.model === 'DFA') {
          const conflicts = allowedSymbols.some((symbol) =>
            prev.transitions.some(
              (transition) =>
                transition.from === from &&
                transition.input === symbol &&
                !(transition.from === from && transition.to === to),
            ),
          )
          if (conflicts) {
            setError('Edit blocked: would create duplicate DFA (state, symbol) transitions.')
            return prev
          }
        }

        const retained = prev.transitions.filter((transition) => !(transition.from === from && transition.to === to))
        const base = group[0]
        const rebuilt = allowedSymbols.map((symbol, index) => ({
          ...base,
          id: `${base.id}-m${index}-${Date.now()}`,
          input: symbol,
        }))

        setError('')
        return { ...prev, transitions: [...retained, ...rebuilt] }
      })
    },
    [definition.transitions, isSymbolAllowed],
  )

  const onDeleteMergedTransition = useCallback((from: string, to: string) => {
    applyDefinitionUpdate((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((transition) => !(transition.from === from && transition.to === to)),
    }))
    setError('')
  }, [])

  const onSelectBatchResult = (index: number) => {
    const selected = batchResults[index]
    if (!selected) return
    setSelectedBatchIndex(index)
    setInput(selected.input)
    setResult(selected.simulation)
    setStepIndex(0)
    setIsPlaying(false)
  }

  const onExportBatchCSV = () => {
    if (batchResults.length === 0) return
    const rows = ['input,accepted,reason', ...batchResults.map((r) => `"${r.input.replace(/"/g, '""')}",${r.accepted},"${r.reason.replace(/"/g, '""')}"`)]
    downloadTextFile(rows.join('\n'), 'batch-results.csv', 'text/csv')
  }

  const onExportBatchJSON = () => {
    if (batchResults.length === 0) return
    downloadTextFile(
      JSON.stringify(batchResults.map((r) => ({ input: r.input, accepted: r.accepted, reason: r.reason })), null, 2),
      'batch-results.json',
      'application/json',
    )
  }

  const applyRegexToNFA = () => {
    try {
      const nfa = regexToNFA(regexInput)
      applyDefinitionUpdate(() => autoLayoutDefinition(nfa))
      setAlphabetInput(nfa.alphabet.join(','))
      setAlphabetError('')
      setConversionSteps(['Tokenized regex and inserted explicit concatenation.', 'Converted to postfix notation.', 'Applied Thompson fragments to build ε-NFA.'])
      setError('')
    } catch {
      setError('Failed to parse regular expression.')
    }
  }

  const applyRegexToDFA = () => {
    try {
      const dfa = nfaToDfa(regexToNFA(regexInput))
      applyDefinitionUpdate(() => autoLayoutDefinition(dfa))
      setAlphabetInput(dfa.alphabet.join(','))
      setAlphabetError('')
      setConversionSteps(['Built ε-NFA from regex (Thompson).', 'Computed ε-closures.', 'Applied subset construction to obtain DFA.'])
      setError('')
    } catch {
      setError('Failed to convert regex to DFA.')
    }
  }

  const convertCurrentNFAtoDFA = () => {
    const converted = nfaToDfa(definition)
    applyDefinitionUpdate(() => autoLayoutDefinition(converted))
    setAlphabetInput(converted.alphabet.join(','))
    setAlphabetError('')
    setConversionSteps(['Started from NFA start ε-closure.', 'Generated DFA states as NFA state subsets.', 'Added transitions for each alphabet symbol.'])
  }

  const minimizeCurrentDFA = () => {
    const minimized = minimizeDFA(definition)
    applyDefinitionUpdate(() => autoLayoutDefinition(minimized))
    setAlphabetInput(minimized.alphabet.join(','))
    setAlphabetError('')
    setConversionSteps(['Partitioned states into accept/non-accept.', 'Refined partitions by transition signatures.', 'Collapsed equivalent states into minimized DFA.'])
  }

  const applyLanguageOperation = () => {
    const operand = clone(templates[selectedOperandTemplate] ?? definition)
    let output: AutomataDefinition
    switch (selectedOperation) {
      case 'union':
        output = unionDFA(definition, operand)
        break
      case 'intersection':
        output = intersectionDFA(definition, operand)
        break
      case 'complement':
        output = complementDFA(definition)
        break
      case 'concatenation':
        output = concatenateNFA(definition, operand)
        break
      case 'kleeneStar':
        output = kleeneStarNFA(definition)
        break
      default:
        output = definition
    }
    applyDefinitionUpdate(() => autoLayoutDefinition(output))
    setAlphabetInput(output.alphabet.join(','))
    setAlphabetError('')
    setConversionSteps([`Applied ${selectedOperation} operation on selected automata.`])
  }

  const onUpdateTransition = (id: string, field: keyof TransitionRule, value: string) => {
    let duplicateBlocked = false
    let invalidSymbolBlocked = false
    applyDefinitionUpdate((prev) => {
      const current = prev.transitions.find((transition) => transition.id === id)
      if (!current) return prev

      const nextValue = value.trim()
      const updated = { ...current, [field]: nextValue } as TransitionRule
      if (field === 'input' && !isSymbolAllowed(prev.model, updated.input, prev.alphabet)) {
        invalidSymbolBlocked = true
        return prev
      }
      if (prev.model === 'DFA') {
        const duplicate = prev.transitions.some((transition) => (
          transition.id !== id && transition.from === updated.from && transition.input === updated.input
        ))
        if (duplicate) {
          duplicateBlocked = true
          return prev
        }
      }

      return {
        ...prev,
        transitions: prev.transitions.map((transition) => (transition.id === id ? updated : transition)),
      }
    })

    if (duplicateBlocked) {
      setError('Duplicate DFA transition blocked. Each (state, symbol) pair must be unique.')
    } else if (invalidSymbolBlocked) {
      setError(`That symbol is not in the alphabet. Σ = ${formatAlphabetLabel(definition.alphabet)}.`)
    } else {
      setError('')
    }
  }

  const onDeleteTransition = (id: string) => {
    applyDefinitionUpdate((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((t) => t.id !== id),
    }))
  }

  const onToggleStart = (id: string) => {
    applyDefinitionUpdate((prev) => ({
      ...prev,
      states: prev.states.map((s) => ({ ...s, isStart: s.id === id })),
    }))
  }

  const onToggleAccept = (id: string) => {
    applyDefinitionUpdate((prev) => ({
      ...prev,
      states: prev.states.map((s) => (s.id === id ? { ...s, isAccept: !s.isAccept } : s)),
    }))
  }

  const autoLayout = () => {
    applyDefinitionUpdate((prev) => autoLayoutDefinition(prev))
  }

  const autoCompleteWithTrapState = () => {
    applyDefinitionUpdate((prev) => {
      if (prev.model !== 'DFA') return prev
      const analysis = analyzeDFA(prev)
      const missingEntries = Object.entries(analysis.missingByState).filter(([, symbols]) => symbols.length > 0)
      if (missingEntries.length === 0) return prev

      const existingIds = new Set(prev.states.map((state) => state.id))
      let trapId = 'qTrap'
      let suffix = 0
      while (existingIds.has(trapId)) {
        suffix += 1
        trapId = `qTrap${suffix}`
      }

      const trapState = {
        id: trapId,
        label: trapId,
        x: 100 + prev.states.length * 90,
        y: 320,
        isStart: false,
        isAccept: false,
      }

      const symbols = dfaSymbols(prev.alphabet)
      const newTransitions: TransitionRule[] = []

      for (const [stateId, missingSymbols] of missingEntries) {
        for (const symbol of missingSymbols) {
          newTransitions.push({
            id: `t${Date.now()}-${stateId}-${symbol}`,
            from: stateId,
            to: trapId,
            input: symbol,
          })
        }
      }

      for (const symbol of symbols) {
        newTransitions.push({
          id: `t${Date.now()}-${trapId}-${symbol}`,
          from: trapId,
          to: trapId,
          input: symbol,
        })
      }

      return autoLayoutDefinition({
        ...prev,
        states: [...prev.states, trapState],
        transitions: [...prev.transitions, ...newTransitions],
      })
    })
    setError('')
  }

  const undo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const previous = stack[stack.length - 1]
      setRedoStack((redo) => [...redo, clone(definition)])
      setDefinition(previous)
      setAlphabetInput(previous.alphabet.join(','))
      setAlphabetError('')
      return stack.slice(0, -1)
    })
  }

  const redo = () => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const next = stack[stack.length - 1]
      setUndoStack((undoEntries) => [...undoEntries, clone(definition)])
      setDefinition(next)
      setAlphabetInput(next.alphabet.join(','))
      setAlphabetError('')
      return stack.slice(0, -1)
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [definition, undoStack.length, redoStack.length])

  const highlightedStates = useMemo(() => currentStep?.stateIds ?? [], [currentStep])
  const dfaAnalysis = useMemo(() => analyzeDFA(definition), [definition])
  const invalidDFAStates = useMemo(
    () => Object.entries(dfaAnalysis.missingByState).filter(([, symbols]) => symbols.length > 0).map(([stateId]) => stateId),
    [dfaAnalysis],
  )

  return (
    <ReactFlowProvider>
      <div className="flex min-h-screen text-slate-900 dark:text-slate-100">
        <Sidebar
          model={definition.model}
          alphabetInput={alphabetInput}
          alphabetSummary={formatAlphabetLabel(definition.alphabet)}
          alphabetError={alphabetError}
          regexInput={regexInput}
          selectedOperation={selectedOperation}
          selectedOperandTemplate={selectedOperandTemplate}
          languageDescription={describeLanguage(definition)}
          conversionSteps={conversionSteps}
          onModelChange={onModelChange}
          onAlphabetChange={onAlphabetChange}
          onRegexInputChange={setRegexInput}
          onRegexToNFA={applyRegexToNFA}
          onRegexToDFA={applyRegexToDFA}
          onConvertNfaToDfa={convertCurrentNFAtoDFA}
          onMinimizeDfa={minimizeCurrentDFA}
          onOperationChange={setSelectedOperation}
          onOperandTemplateChange={setSelectedOperandTemplate}
          onApplyOperation={applyLanguageOperation}
          onAddState={addState}
          onDeleteState={deleteState}
          onUndo={undo}
          onRedo={redo}
          onAutoLayout={autoLayout}
          onAutoCompleteDFA={autoCompleteWithTrapState}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onSave={() => downloadJSON(definition)}
          onExport={() => exportCanvasAsPNG(canvasRef.current)}
          onLoad={async (file) => {
            try {
              const loaded = await readJSONFile(file)
              applyDefinitionUpdate(() => autoLayoutDefinition(loaded))
              setAlphabetInput(loaded.alphabet.join(','))
              setAlphabetError('')
              reset()
            } catch {
              setError('Invalid JSON file')
            }
          }}
          onTemplate={(name) => {
            applyDefinitionUpdate(() => autoLayoutDefinition(clone(templates[name])))
            setAlphabetInput(templates[name].alphabet.join(','))
            setAlphabetError('')
            reset()
          }}
          templates={templates}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 pl-3">
          <section className="flex min-h-[42vh] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-card backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/90 to-indigo-50/30 px-4 py-2.5 dark:border-slate-700/60 dark:from-slate-900/90 dark:to-indigo-950/40">
              <div>
                <h2 className="font-display text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  Graph canvas
                </h2>
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Drag states · Connect handles · Right-click for options
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {transitionNotice && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200">
                    {transitionNotice}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-white"
                  title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />}
                </button>
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200">
                  {definition.model}
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2 sm:p-3">
            <AutomataCanvas
              definition={definition}
              highlightedStates={highlightedStates}
              invalidStates={definition.model === 'DFA' ? invalidDFAStates : []}
              highlightedTransition={currentStep?.transitionId}
              flashTransitionId={flashTransitionId}
              onStateMove={onStateMove}
              onCreateTransitions={onCreateTransitionsFromCanvas}
              onDeleteMergedTransition={onDeleteMergedTransition}
              onEditMergedTransition={onEditMergedTransition}
              onToggleStart={onToggleStart}
              onToggleAccept={onToggleAccept}
              canvasRef={canvasRef}
            />
            </div>
          </section>
          <section className="flex h-[min(26vh,320px)] min-h-[200px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-card backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/50">
            <div className="border-b border-slate-200/60 bg-slate-50/80 px-4 py-2 dark:border-slate-700/60 dark:bg-slate-900/80">
              <h2 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">States & transitions</h2>
              <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">Edit the transition table or toggle start / accept</p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
            <TransitionTable
              definition={definition}
              onUpdateTransition={onUpdateTransition}
              onAddTransition={addTransitionDefinition}
              onDeleteTransition={onDeleteTransition}
              onToggleStart={onToggleStart}
              onToggleAccept={onToggleAccept}
            />
            </div>
          </section>
          <section className="flex min-h-[220px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-card backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/50">
            <div className="border-b border-slate-200/60 bg-gradient-to-r from-emerald-50/50 to-slate-50/80 px-4 py-2 dark:border-slate-700/60 dark:from-emerald-950/30 dark:to-slate-900/80">
              <h2 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Simulation</h2>
              <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">Step through or batch-test input strings</p>
            </div>
            <div className="ui-scroll min-h-0 flex-1 overflow-y-auto">
            <SimulationPanel
              input={input}
              onInputChange={setInput}
              batchInput={batchInput}
              onBatchInputChange={setBatchInput}
              onRunBatch={runBatch}
              batchResults={batchResults}
              selectedBatchIndex={selectedBatchIndex}
              onSelectBatchResult={onSelectBatchResult}
              onExportBatchCSV={onExportBatchCSV}
              onExportBatchJSON={onExportBatchJSON}
              onRun={run}
              onNext={nextStep}
              onPlayPause={() => setIsPlaying((v) => !v)}
              onReset={reset}
              isPlaying={isPlaying}
              currentStepIndex={stepIndex}
              result={result}
            />
            {error && (
              <div className="mx-3 mb-2 mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
                {error}
              </div>
            )}
            {definition.model === 'DFA' && (
              <div
                className={
                  dfaAnalysis.isComplete
                    ? 'mx-3 mb-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'mx-3 mb-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100'
                }
              >
                {dfaAnalysis.isComplete ? 'DFA is complete' : 'DFA is incomplete'}
              </div>
            )}
            {definition.model === 'DFA' && dfaAnalysis.issues.length > 0 && (
              <div className="ui-scroll mx-3 mb-3 max-h-28 overflow-y-auto rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100">
                {dfaAnalysis.issues.map((issue, idx) => (
                  <div
                    key={`${issue}-${idx}`}
                    className="border-b border-amber-100 py-1 last:border-0 dark:border-amber-800/50"
                  >
                    {issue}
                  </div>
                ))}
              </div>
            )}
            </div>
          </section>
        </main>
      </div>
    </ReactFlowProvider>
  )
}

export default App

