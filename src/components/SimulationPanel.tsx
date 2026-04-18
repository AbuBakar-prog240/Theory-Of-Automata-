import { FileJson, FileSpreadsheet, ListChecks, Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import type { SimulationResult } from '../types'

interface BatchRunResult {
  input: string
  accepted: boolean
  reason: string
}

interface Props {
  input: string
  onInputChange: (value: string) => void
  batchInput: string
  onBatchInputChange: (value: string) => void
  onRunBatch: () => void
  batchResults: BatchRunResult[]
  selectedBatchIndex: number
  onSelectBatchResult: (index: number) => void
  onExportBatchCSV: () => void
  onExportBatchJSON: () => void
  onRun: () => void
  onNext: () => void
  onPlayPause: () => void
  onReset: () => void
  isPlaying: boolean
  currentStepIndex: number
  result: SimulationResult | null
}

export function SimulationPanel({
  input,
  onInputChange,
  batchInput,
  onBatchInputChange,
  onRunBatch,
  batchResults,
  selectedBatchIndex,
  onSelectBatchResult,
  onExportBatchCSV,
  onExportBatchJSON,
  onRun,
  onNext,
  onPlayPause,
  onReset,
  isPlaying,
  currentStepIndex,
  result,
}: Props) {
  const step = result?.steps[currentStepIndex]
  const currentSymbol = step && step.consumed < step.input.length ? step.input[step.consumed] : '∅'
  const remainingInput = step ? step.input.slice(step.consumed) : ''

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="ui-input w-64 max-w-full font-mono text-sm"
          placeholder="Input string"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
        />
        <button type="button" className="ui-btn-primary py-2 text-xs" onClick={onRun}>
          <Play className="h-3.5 w-3.5" strokeWidth={2.5} />
          Run
        </button>
        <button type="button" className="ui-btn-slate py-2 text-xs" onClick={onNext}>
          <StepForward className="h-3.5 w-3.5" strokeWidth={2} />
          Next
        </button>
        <button type="button" className="ui-btn-indigo py-2 text-xs" onClick={onPlayPause}>
          {isPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5" strokeWidth={2} />
              Pause
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" strokeWidth={2.5} />
              Play
            </>
          )}
        </button>
        <button type="button" className="ui-btn-danger py-2 text-xs" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <textarea
          className="ui-input min-h-[4.5rem] flex-1 resize-y font-mono text-xs leading-relaxed"
          value={batchInput}
          onChange={(e) => onBatchInputChange(e.target.value)}
          placeholder="Batch inputs — one per line or comma-separated"
        />
        <button type="button" className="ui-btn-emerald shrink-0 self-start py-3 sm:self-stretch" onClick={onRunBatch}>
          <ListChecks className="h-4 w-4" strokeWidth={2} />
          Run batch
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2 xl:grid-cols-4">
          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              result.accepted
                ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white'
                : 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white'
            }`}
          >
            <div className="ui-section-title mb-1">Result</div>
            <div className={`font-display text-lg font-bold ${result.accepted ? 'text-emerald-700' : 'text-rose-700'}`}>
              {result.accepted ? 'Accepted' : 'Rejected'}
            </div>
            <p className="mt-1 leading-relaxed text-slate-600">{result.reason}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="ui-section-title mb-1">Current step</div>
            <div className="font-mono text-slate-800">
              {currentStepIndex + 1} / {result.steps.length}
            </div>
            <p className="mt-2 leading-relaxed text-slate-600">
              Active ({step?.stateIds.length ?? 0}):{' '}
              <span className="font-semibold text-indigo-700">{step?.stateIds.join(', ') || '—'}</span>
            </p>
            {step?.stack && <p className="mt-1 font-mono text-slate-600">Stack: {step.stack.join(' ')}</p>}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="ui-section-title mb-1">Input progress</div>
            <p className="text-slate-600">
              Current:{' '}
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-mono font-bold text-indigo-800">{currentSymbol}</span>
            </p>
            <p className="mt-2 text-slate-600">
              Remaining:{' '}
              <span className="font-mono text-slate-800">{remainingInput || '⟨empty⟩'}</span>
            </p>
            <p className="mt-1 font-mono text-slate-500">
              {step?.consumed ?? 0} / {step?.input.length ?? 0} consumed
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="ui-section-title mb-1">Tape</div>
            {step?.tape ? (
              <p className="font-mono text-slate-700">
                {step.tape.join(' ')} <span className="text-slate-500">(head {step.head})</span>
              </p>
            ) : (
              <p className="text-slate-400">Not applicable</p>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 shadow-sm">
          <div className="border-b border-slate-200/60 bg-white/80 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Computation history</span>
          </div>
          <div className="ui-scroll max-h-32 overflow-y-auto text-xs">
            {result.steps.map((historyStep, idx) => {
              const symbol =
                historyStep.consumed < historyStep.input.length ? historyStep.input[historyStep.consumed] : '∅'
              const isCurrent = idx === currentStepIndex
              return (
                <div
                  key={`step-${idx}`}
                  className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-0 ${
                    isCurrent ? 'bg-indigo-50/80' : 'bg-transparent'
                  }`}
                >
                  <span className="font-mono text-slate-500">#{idx + 1}</span>
                  <span className="text-slate-700">{historyStep.stateIds.join(', ') || '—'}</span>
                  <span className="font-mono text-indigo-600">{symbol}</span>
                  <span className="font-mono text-slate-500">{historyStep.input.slice(historyStep.consumed) || '⟨empty⟩'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {batchResults.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 bg-slate-50/80 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Batch results ({batchResults.length})
            </span>
            <div className="flex gap-2">
              <button type="button" className="ui-btn-muted py-1.5 pl-2 pr-2.5 text-[0.65rem]" onClick={onExportBatchCSV}>
                <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2} />
                CSV
              </button>
              <button type="button" className="ui-btn-muted py-1.5 pl-2 pr-2.5 text-[0.65rem]" onClick={onExportBatchJSON}>
                <FileJson className="h-3.5 w-3.5" strokeWidth={2} />
                JSON
              </button>
            </div>
          </div>
          <div className="ui-scroll max-h-36 overflow-y-auto text-xs">
            {batchResults.map((entry, idx) => (
              <button
                key={`${entry.input}-${idx}`}
                type="button"
                className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition last:border-0 ${
                  selectedBatchIndex === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => onSelectBatchResult(idx)}
              >
                <span className="shrink-0 font-mono font-medium text-slate-800">{entry.input === '' ? '⟨empty⟩' : entry.input}</span>
                <span className={`text-right leading-snug ${entry.accepted ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {entry.accepted ? 'Accepted' : 'Rejected'} — {entry.reason}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
