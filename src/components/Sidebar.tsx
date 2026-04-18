import {
  BookOpen,
  Braces,
  GitBranch,
  ImageDown,
  LayoutGrid,
  Minimize2,
  Redo2,
  Regex,
  Save,
  Shapes,
  Sigma,
  Trash2,
  Type,
  Undo2,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react'
import type { AutomataDefinition, AutomataModel } from '../types'

interface Props {
  model: AutomataModel
  alphabetInput: string
  /** Stored alphabet Σ (formatted for display) */
  alphabetSummary: string
  alphabetError: string
  regexInput: string
  selectedOperation: string
  selectedOperandTemplate: string
  languageDescription: string
  conversionSteps: string[]
  onModelChange: (model: AutomataModel) => void
  onAlphabetChange: (value: string) => void
  onRegexInputChange: (value: string) => void
  onRegexToNFA: () => void
  onRegexToDFA: () => void
  onConvertNfaToDfa: () => void
  onMinimizeDfa: () => void
  onOperationChange: (value: string) => void
  onOperandTemplateChange: (value: string) => void
  onApplyOperation: () => void
  onAddState: () => void
  onDeleteState: () => void
  onUndo: () => void
  onRedo: () => void
  onAutoLayout: () => void
  onAutoCompleteDFA: () => void
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onExport: () => void
  onLoad: (file: File) => void
  onTemplate: (name: string) => void
  templates: Record<string, AutomataDefinition>
}

export function Sidebar({
  model,
  alphabetInput,
  alphabetSummary,
  alphabetError,
  regexInput,
  selectedOperation,
  selectedOperandTemplate,
  languageDescription,
  conversionSteps,
  onModelChange,
  onAlphabetChange,
  onRegexInputChange,
  onRegexToNFA,
  onRegexToDFA,
  onConvertNfaToDfa,
  onMinimizeDfa,
  onOperationChange,
  onOperandTemplateChange,
  onApplyOperation,
  onAddState,
  onDeleteState,
  onUndo,
  onRedo,
  onAutoLayout,
  onAutoCompleteDFA,
  canUndo,
  canRedo,
  onSave,
  onExport,
  onLoad,
  onTemplate,
  templates,
}: Props) {
  return (
    <aside className="ui-scroll sticky top-0 flex h-screen w-[19.5rem] shrink-0 flex-col overflow-y-auto border-r border-slate-200/80 bg-white/75 px-4 py-6 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
            <Shapes className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">VASim++</h1>
            <p className="text-xs font-medium text-slate-500">Visual automata lab</p>
          </div>
        </div>
      </div>

      <div className="ui-card mb-4 space-y-3">
        <div className="ui-section-title">Model & alphabet</div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Automata model</label>
          <select className="ui-select" value={model} onChange={(e) => onModelChange(e.target.value as AutomataModel)}>
            <option>DFA</option>
            <option>NFA</option>
            <option>PDA</option>
            <option>TM</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Type className="h-3.5 w-3.5 text-indigo-500" strokeWidth={2} />
            Alphabet
          </label>
          <input
            className={`ui-input font-mono text-xs ${alphabetError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/20' : ''}`}
            value={alphabetInput}
            onChange={(e) => onAlphabetChange(e.target.value)}
            placeholder="e.g. 0,1,a,b"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={alphabetError ? true : undefined}
            aria-describedby="alphabet-help"
          />
          <p id="alphabet-help" className="mt-1 text-[0.65rem] leading-relaxed text-slate-400">
            Comma-separated. Each symbol is one character (ε allowed for NFA/PDA only).
          </p>
          <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-indigo-600/90">Stored alphabet Σ</div>
            <div className="mt-0.5 font-mono text-xs font-semibold text-indigo-950">{alphabetSummary}</div>
          </div>
          {alphabetError ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[0.7rem] font-medium leading-snug text-rose-800">
              {alphabetError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="ui-card mb-4 space-y-2">
        <div className="ui-section-title">Canvas</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="ui-btn-primary py-2 text-xs" onClick={onAddState}>
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add state
          </button>
          <button type="button" className="ui-btn-danger py-2 text-xs" onClick={onDeleteState}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Remove last
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="ui-btn-slate py-2 text-xs" onClick={onUndo} disabled={!canUndo}>
            <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
            Undo
          </button>
          <button type="button" className="ui-btn-slate py-2 text-xs" onClick={onRedo} disabled={!canRedo}>
            <Redo2 className="h-3.5 w-3.5" strokeWidth={2} />
            Redo
          </button>
        </div>
        <button type="button" className="ui-btn-accent w-full py-2.5 text-xs" onClick={onAutoLayout}>
          <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          Auto layout
        </button>
        {model === 'DFA' && (
          <button type="button" className="ui-btn-amber w-full py-2.5 text-xs" onClick={onAutoCompleteDFA}>
            <Wand2 className="h-4 w-4" strokeWidth={2} />
            Complete with trap state
          </button>
        )}
      </div>

      <div className="ui-card mb-4 space-y-3">
        <div className="ui-section-title">Regular expressions</div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Regex className="h-3.5 w-3.5 text-teal-600" strokeWidth={2} />
            Pattern
          </label>
          <input
            className="ui-input font-mono text-xs"
            value={regexInput}
            onChange={(e) => onRegexInputChange(e.target.value)}
            placeholder="(a|b)*abb"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="ui-btn-teal py-2 text-[0.7rem] leading-tight" onClick={onRegexToNFA}>
            <Braces className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Regex → NFA
          </button>
          <button type="button" className="ui-btn-teal py-2 text-[0.7rem] leading-tight" onClick={onRegexToDFA}>
            <Braces className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Regex → DFA
          </button>
        </div>
      </div>

      <div className="ui-card mb-4 space-y-3">
        <div className="ui-section-title">Conversions</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="ui-btn-slate py-2 text-[0.7rem]" onClick={onConvertNfaToDfa}>
            <GitBranch className="h-3.5 w-3.5" strokeWidth={2} />
            NFA → DFA
          </button>
          <button type="button" className="ui-btn-slate py-2 text-[0.7rem]" onClick={onMinimizeDfa}>
            <Minimize2 className="h-3.5 w-3.5" strokeWidth={2} />
            Minimize
          </button>
        </div>
      </div>

      <div className="ui-card mb-4 space-y-3">
        <div className="ui-section-title">Language operations</div>
        <select className="ui-select text-xs" value={selectedOperation} onChange={(e) => onOperationChange(e.target.value)}>
          <option value="union">Union</option>
          <option value="intersection">Intersection</option>
          <option value="complement">Complement</option>
          <option value="concatenation">Concatenation</option>
          <option value="kleeneStar">Kleene star</option>
        </select>
        <select className="ui-select text-xs" value={selectedOperandTemplate} onChange={(e) => onOperandTemplateChange(e.target.value)}>
          {Object.keys(templates).map((name) => (
            <option key={`op-${name}`} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button type="button" className="ui-btn-fuchsia w-full py-2.5 text-xs" onClick={onApplyOperation}>
          <Sigma className="h-4 w-4" strokeWidth={2} />
          Apply operation
        </button>
      </div>

      <div className="mb-4 space-y-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-sm">
        <div className="ui-section-title text-indigo-600/80">Language</div>
        <p className="text-xs leading-relaxed text-slate-600">{languageDescription}</p>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
        <div className="ui-section-title">Conversion log</div>
        <div className="ui-scroll mt-2 max-h-28 overflow-y-auto text-xs leading-relaxed text-slate-600">
          {conversionSteps.length === 0 ? (
            <span className="text-slate-400">No steps yet — run a conversion.</span>
          ) : (
            <ul className="space-y-1">
              {conversionSteps.map((step, idx) => (
                <li key={`conv-${idx}`} className="flex gap-2 border-l-2 border-indigo-200 pl-2">
                  <span className="shrink-0 font-mono text-[0.65rem] text-indigo-400">{idx + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="ui-card mb-4 space-y-2">
        <div className="ui-section-title">Project</div>
        <button type="button" className="ui-btn-slate w-full justify-start py-2.5 text-xs" onClick={onSave}>
          <Save className="h-4 w-4" strokeWidth={2} />
          Save JSON
        </button>
        <button type="button" className="ui-btn-indigo w-full justify-start py-2.5 text-xs" onClick={onExport}>
          <ImageDown className="h-4 w-4" strokeWidth={2} />
          Export PNG
        </button>
        <label className="ui-btn-emerald flex w-full cursor-pointer justify-start py-2.5 text-xs">
          <Upload className="h-4 w-4" strokeWidth={2} />
          Load JSON
          <input
            type="file"
            className="hidden"
            accept="application/json"
            onChange={(e) => e.target.files?.[0] && onLoad(e.target.files[0])}
          />
        </label>
      </div>

      <div>
        <div className="ui-section-title mb-2 px-1">Templates</div>
        <div className="space-y-1.5">
          {Object.keys(templates).map((name) => (
            <button
              key={name}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900"
              onClick={() => onTemplate(name)}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-indigo-400" strokeWidth={2} />
              <span className="truncate">{name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
