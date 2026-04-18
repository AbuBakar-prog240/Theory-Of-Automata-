import { useEffect, useMemo, useState } from 'react'
import { CircleDot, Flag, Trash2 } from 'lucide-react'
import type { AutomataDefinition, TransitionRule } from '../types'

interface Props {
  definition: AutomataDefinition
  onUpdateTransition: (id: string, field: keyof TransitionRule, value: string) => void
  onAddTransition: (from: string, to: string, input: string) => void
  onDeleteTransition: (id: string) => void
  onToggleStart: (id: string) => void
  onToggleAccept: (id: string) => void
}

export function TransitionTable({
  definition,
  onUpdateTransition,
  onAddTransition,
  onDeleteTransition,
  onToggleStart,
  onToggleAccept,
}: Props) {
  const dfaInputAlphabet = useMemo(
    () =>
      definition.model === 'DFA'
        ? definition.alphabet.filter((symbol) => symbol !== '' && symbol !== 'ε' && symbol !== 'e')
        : definition.alphabet,
    [definition.alphabet, definition.model],
  )

  const defaultSymbol = useMemo(
    () => dfaInputAlphabet.find((symbol) => symbol && symbol !== 'ε' && symbol !== 'e') ?? '0',
    [dfaInputAlphabet],
  )
  const [newFrom, setNewFrom] = useState(definition.states[0]?.id ?? '')
  const [newTo, setNewTo] = useState(definition.states[0]?.id ?? '')
  const [newInput, setNewInput] = useState(defaultSymbol)

  useEffect(() => {
    setNewFrom(definition.states[0]?.id ?? '')
    setNewTo(definition.states[0]?.id ?? '')
    setNewInput(defaultSymbol)
  }, [definition.states, defaultSymbol])

  const addTransitionFromTable = () => {
    if (!newFrom || !newTo || !newInput.trim()) return
    onAddTransition(newFrom, newTo, newInput.trim())
  }

  const cellSelect = 'ui-select py-1.5 text-xs'
  const cellInput = 'ui-input py-1.5 text-xs'

  return (
    <div className="ui-scroll flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <h3 className="ui-section-title mb-2">States</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {definition.states.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-sm"
            >
              <div className="font-display text-sm font-bold text-slate-800">{s.label}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="ui-btn-muted flex-1 py-1.5 text-[0.65rem]"
                  onClick={() => onToggleStart(s.id)}
                >
                  <CircleDot className="h-3 w-3" strokeWidth={2} />
                  Start
                </button>
                <button
                  type="button"
                  className="ui-btn-emerald flex-1 py-1.5 text-[0.65rem]"
                  onClick={() => onToggleAccept(s.id)}
                >
                  <Flag className="h-3 w-3" strokeWidth={2} />
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="ui-section-title mb-2">Add transition</h3>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
          <div className="min-w-[5rem]">
            <div className="mb-1 text-[0.65rem] font-semibold text-slate-500">From</div>
            <select className={cellSelect} value={newFrom} onChange={(e) => setNewFrom(e.target.value)}>
              {definition.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[5rem]">
            <div className="mb-1 text-[0.65rem] font-semibold text-slate-500">To</div>
            <select className={cellSelect} value={newTo} onChange={(e) => setNewTo(e.target.value)}>
              {definition.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[4.5rem]">
            <div className="mb-1 text-[0.65rem] font-semibold text-slate-500">Input</div>
            {definition.model === 'DFA' ? (
              <select className={cellSelect} value={newInput} onChange={(e) => setNewInput(e.target.value)}>
                {dfaInputAlphabet.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            ) : (
              <input className={`${cellInput} w-20 font-mono`} value={newInput} onChange={(e) => setNewInput(e.target.value)} />
            )}
          </div>
          <button type="button" className="ui-btn-primary shrink-0 py-2 text-xs" onClick={addTransitionFromTable}>
            Add transition
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80">
        <div className="ui-scroll max-h-full overflow-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="sticky top-0 z-[1] bg-gradient-to-b from-slate-100 to-slate-50 shadow-sm">
                <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                  From
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                  To
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                  Input
                </th>
                {definition.model === 'PDA' && (
                  <>
                    <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                      Stack read
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                      Stack write
                    </th>
                  </>
                )}
                {definition.model === 'TM' && (
                  <>
                    <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                      Tape read
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                      Tape write
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                      Move
                    </th>
                  </>
                )}
                <th className="border-b border-slate-200 px-3 py-2.5 font-display text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {definition.transitions.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 bg-white/50 transition hover:bg-indigo-50/30">
                  <td className="px-3 py-2 font-mono text-slate-700">{t.from}</td>
                  <td className="px-3 py-2">
                    <select
                      className={cellSelect}
                      value={t.to}
                      onChange={(e) => onUpdateTransition(t.id, 'to', e.target.value)}
                    >
                      {definition.states.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {definition.model === 'DFA' ? (
                      <select
                        className={`${cellSelect} w-24`}
                        value={dfaInputAlphabet.includes(t.input) ? t.input : (dfaInputAlphabet[0] ?? t.input ?? '')}
                        onChange={(e) => onUpdateTransition(t.id, 'input', e.target.value)}
                      >
                        {dfaInputAlphabet.map((symbol) => (
                          <option key={symbol} value={symbol}>
                            {symbol}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={`${cellInput} w-20 font-mono`}
                        value={t.input}
                        onChange={(e) => onUpdateTransition(t.id, 'input', e.target.value)}
                      />
                    )}
                  </td>
                  {definition.model === 'PDA' && (
                    <>
                      <td className="px-3 py-2">
                        <input
                          className={`${cellInput} w-20 font-mono`}
                          value={t.stackRead ?? ''}
                          onChange={(e) => onUpdateTransition(t.id, 'stackRead', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={`${cellInput} w-20 font-mono`}
                          value={t.stackWrite ?? ''}
                          onChange={(e) => onUpdateTransition(t.id, 'stackWrite', e.target.value)}
                        />
                      </td>
                    </>
                  )}
                  {definition.model === 'TM' && (
                    <>
                      <td className="px-3 py-2">
                        <input
                          className={`${cellInput} w-20 font-mono`}
                          value={t.tapeRead ?? ''}
                          onChange={(e) => onUpdateTransition(t.id, 'tapeRead', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={`${cellInput} w-20 font-mono`}
                          value={t.tapeWrite ?? ''}
                          onChange={(e) => onUpdateTransition(t.id, 'tapeWrite', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={`${cellInput} w-14 font-mono`}
                          value={t.move ?? 'S'}
                          onChange={(e) => onUpdateTransition(t.id, 'move', e.target.value)}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="ui-btn-danger py-1.5 pl-2 pr-2.5 text-[0.65rem]"
                      onClick={() => onDeleteTransition(t.id)}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
