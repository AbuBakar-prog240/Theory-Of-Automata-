import { LayoutGrid, Map as MapIcon, Square } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  MiniMap,
  Position,
} from 'reactflow'
import type { Connection, Edge, Node } from 'reactflow'
import 'reactflow/dist/style.css'
import type { AutomataDefinition, TransitionRule } from '../types'
import { useTheme } from '../theme/ThemeContext'
import { AutomataStateNode } from './AutomataStateNode'
import { isTrapStateId } from '../utils/trapState'
import { AutomataTransitionEdge } from './AutomataTransitionEdge'

interface Props {
  definition: AutomataDefinition
  highlightedStates: string[]
  invalidStates?: string[]
  highlightedTransition?: string
  flashTransitionId?: string | null
  onStateMove: (id: string, x: number, y: number) => void
  onCreateTransitions: (from: string, to: string, rawSymbols: string) => string | null
  onDeleteMergedTransition: (from: string, to: string) => void
  onEditMergedTransition: (from: string, to: string) => void
  onToggleStart: (id: string) => void
  onToggleAccept: (id: string) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
}

const labelForTransition = (t: TransitionRule, model: string) => {
  if (model === 'PDA') return `${t.input}, ${t.stackRead ?? 'e'} -> ${t.stackWrite ?? 'e'}`
  if (model === 'TM') return `${t.tapeRead ?? t.input} / ${t.tapeWrite ?? '_'} , ${t.move ?? 'S'}`
  return t.input
}

/**
 * Edges are derived from `definition.transitions` (single source of truth, synced with the table).
 */
export function AutomataCanvas({
  definition,
  highlightedStates,
  invalidStates = [],
  highlightedTransition,
  flashTransitionId = null,
  onStateMove,
  onCreateTransitions,
  onDeleteMergedTransition,
  onEditMergedTransition,
  onToggleStart,
  onToggleAccept,
  canvasRef,
}: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const edgeStroke = isDark ? '#94a3b8' : '#64748b'
  const edgeActive = isDark ? '#a5b4fc' : '#4f46e5'

  const [gridStyle, setGridStyle] = useState<'dots' | 'lines'>('dots')

  const nodeTypes = useMemo(() => ({ automataState: AutomataStateNode }), [])
  const edgeTypes = useMemo(() => ({ automataTransition: AutomataTransitionEdge }), [])

  const defaultEdgeOptions = useMemo(
    () =>
      ({
        type: 'smoothstep' as const,
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 22,
          height: 22,
          color: edgeStroke,
        },
        style: { stroke: edgeStroke, strokeWidth: 2 } as CSSProperties,
      }) satisfies Partial<Edge>,
    [edgeStroke],
  )

  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [edgeMenu, setEdgeMenu] = useState<{ x: number; y: number; from: string; to: string } | null>(null)
  const [pendingConnection, setPendingConnection] = useState<{ from: string; to: string } | null>(null)
  const [transitionSymbols, setTransitionSymbols] = useState('')
  const [connectionError, setConnectionError] = useState('')

  const bgVariant = gridStyle === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines
  const bgColor = isDark ? '#334155' : '#e2e8f0'
  const bgGap = gridStyle === 'dots' ? 20 : 24
  const bgSize = gridStyle === 'dots' ? 1.1 : 0.9

  const nodes = useMemo<Node[]>(
    () =>
      definition.states.map((s) => ({
        id: s.id,
        type: 'automataState',
        data: {
          label: s.label,
          isStart: s.isStart,
          isAccept: s.isAccept,
          isActive: highlightedStates.includes(s.id),
          hasValidationError: invalidStates.includes(s.id),
          isTrap: isTrapStateId(s.id),
        },
        position: { x: s.x, y: s.y },
        style: { transition: 'transform 280ms ease, opacity 280ms ease' },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })),
    [definition.states, highlightedStates, invalidStates],
  )

  const edges = useMemo<Edge[]>(
    () => {
      const grouped = new Map<string, TransitionRule[]>()
      for (const transition of definition.transitions) {
        const key = `${transition.from}__${transition.to}`
        const existing = grouped.get(key) ?? []
        existing.push(transition)
        grouped.set(key, existing)
      }

      const visualEdges: Edge[] = []
      for (const [key, group] of grouped.entries()) {
        const [from, to] = key.split('__')
        const labels = [...new Set(group.map((transition) => labelForTransition(transition, definition.model)))]
        const label = labels.join(', ')
        const active =
          group.some((transition) => transition.id === highlightedTransition) ||
          (flashTransitionId !== null && group.some((transition) => transition.id === flashTransitionId))
        const isSelfLoop = from === to
        const hasReverse = grouped.has(`${to}__${from}`)
        const curveOffset = hasReverse ? (from < to ? 48 : -48) : 0
        const strokeColor = active ? edgeActive : edgeStroke

        visualEdges.push({
          id: key,
          source: from,
          target: to,
          sourceHandle: isSelfLoop ? 'loop-source' : undefined,
          targetHandle: isSelfLoop ? 'loop-target' : undefined,
          type: 'automataTransition',
          data: {
            label,
            isActive: active,
            curveOffset,
            isSelfLoop,
            canEdit: definition.model === 'DFA' || definition.model === 'NFA',
            onEditLabel: () => onEditMergedTransition(from, to),
            stroke: edgeStroke,
            activeStroke: edgeActive,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 22,
            height: 22,
            color: strokeColor,
            orient: 'auto',
            markerUnits: 'strokeWidth',
          },
          animated: active,
          style: { stroke: strokeColor, strokeWidth: active ? 2.5 : 2 },
        })
      }

      return visualEdges
    },
    [
      definition.transitions,
      definition.model,
      highlightedTransition,
      flashTransitionId,
      onEditMergedTransition,
      edgeStroke,
      edgeActive,
    ],
  )

  const miniMapNodeColor = useMemo(
    () => (node: Node) => {
      const d = node.data as { isActive?: boolean; isAccept?: boolean; isStart?: boolean; isTrap?: boolean }
      if (d?.isActive) return isDark ? '#fbbf24' : '#d97706'
      if (d?.isAccept) return isDark ? '#34d399' : '#059669'
      if (d?.isTrap) return isDark ? '#64748b' : '#94a3b8'
      if (d?.isStart) return isDark ? '#818cf8' : '#4f46e5'
      return isDark ? '#475569' : '#cbd5e1'
    },
    [isDark],
  )

  return (
    <div
      ref={canvasRef}
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:shadow-[0_12px_40px_-16px_rgb(0_0_0/0.55)] dark:ring-white/[0.06]"
    >
      <div className="relative min-h-[min(42vh,520px)] w-full flex-1">
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-md backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/95">
          <div className="pointer-events-auto flex rounded-lg bg-slate-100/80 p-0.5 dark:bg-slate-900/80">
            <button
              type="button"
              title="Dot grid"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                gridStyle === 'dots'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              onClick={() => setGridStyle('dots')}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Line grid"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                gridStyle === 'lines'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              onClick={() => setGridStyle('lines')}
            >
              <Square className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <div
            className="pointer-events-none flex items-center gap-1 border-l border-slate-200/80 pl-2 dark:border-slate-600"
            title="Mini-map below"
          >
            <MapIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" strokeWidth={2} />
          </div>
        </div>

        <ReactFlow
          className="h-full w-full !bg-transparent"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable
          fitView
          fitViewOptions={{ padding: 0.22, maxZoom: 1.35, minZoom: 0.12 }}
          minZoom={0.12}
          maxZoom={2}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={{ hideAttribution: true }}
          onNodeDragStop={(_, node) => onStateMove(node.id, node.position.x, node.position.y)}
          onConnect={(conn: Connection) => {
            if (!conn.source || !conn.target) return
            setPendingConnection({ from: conn.source, to: conn.target })
            setTransitionSymbols('')
            setConnectionError('')
          }}
          onPaneClick={() => {
            setMenu(null)
            setEdgeMenu(null)
          }}
          onNodeContextMenu={(event, node) => {
            event.preventDefault()
            setEdgeMenu(null)
            setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id })
          }}
          onEdgeContextMenu={(event, edge) => {
            event.preventDefault()
            const [from, to] = edge.id.split('__')
            setMenu(null)
            setEdgeMenu({ x: event.clientX, y: event.clientY, from, to })
          }}
        >
          <Background
            id="vasim-grid"
            variant={bgVariant}
            gap={bgGap}
            size={bgSize}
            color={bgColor}
            className={isDark ? 'opacity-[0.22]' : 'opacity-[0.65]'}
          />
          <MiniMap
            position="bottom-left"
            className="!m-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-lg dark:border-slate-600 dark:bg-slate-800/95"
            style={{ height: 120, width: 168 }}
            nodeStrokeWidth={2}
            nodeColor={miniMapNodeColor}
            nodeStrokeColor={(n) => {
              const d = n.data as { isActive?: boolean }
              return d?.isActive ? (isDark ? '#fbbf24' : '#d97706') : isDark ? '#64748b' : '#94a3b8'
            }}
            maskColor={isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(248, 250, 252, 0.78)'}
            pannable
            zoomable
          />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="!m-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800/95 [&_button]:rounded-lg [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-slate-600 [&_button:hover]:bg-indigo-50 [&_button:hover]:text-indigo-700 dark:[&_button]:text-slate-300 dark:[&_button:hover]:bg-slate-700 dark:[&_button:hover]:text-white"
          />
        </ReactFlow>
      </div>

      {menu && (
        <div
          className="absolute z-20 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white/98 p-1 shadow-xl backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/98"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={() => {
              onToggleStart(menu.nodeId)
              setMenu(null)
            }}
          >
            Set as start state
          </button>
          <button
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={() => {
              onToggleAccept(menu.nodeId)
              setMenu(null)
            }}
          >
            Toggle accept state
          </button>
        </div>
      )}
      {edgeMenu && (
        <div
          className="absolute z-20 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white/98 p-1 shadow-xl backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/98"
          style={{ left: edgeMenu.x, top: edgeMenu.y }}
        >
          <button
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={() => {
              onEditMergedTransition(edgeMenu.from, edgeMenu.to)
              setEdgeMenu(null)
            }}
          >
            Edit transition labels
          </button>
          <button
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50"
            onClick={() => {
              onDeleteMergedTransition(edgeMenu.from, edgeMenu.to)
              setEdgeMenu(null)
            }}
          >
            Delete transition(s)
          </button>
        </div>
      )}
      {pendingConnection && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[3px] dark:bg-slate-950/70">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
            <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
              New transition
              <span className="mt-1 block font-mono text-xs font-normal text-indigo-600 dark:text-indigo-300">
                {pendingConnection.from} → {pendingConnection.to}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {definition.model === 'DFA'
                ? 'Enter one alphabet symbol for this arrow. Incomplete DFAs are allowed; use the table or “Auto-complete” to fill missing moves later.'
                : 'Enter symbols separated by commas. NFA allows ε (epsilon).'}
            </p>
            <input
              className="ui-input mt-4 font-mono text-sm dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100"
              value={transitionSymbols}
              onChange={(e) => setTransitionSymbols(e.target.value)}
              placeholder="e.g. 0, 1 or ε"
              autoFocus
            />
            {connectionError && (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200">
                {connectionError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="ui-btn-secondary px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                onClick={() => {
                  setPendingConnection(null)
                  setConnectionError('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn-primary px-4 py-2 text-sm"
                onClick={() => {
                  const error = onCreateTransitions(pendingConnection.from, pendingConnection.to, transitionSymbols)
                  if (error) {
                    setConnectionError(error)
                    return
                  }
                  setPendingConnection(null)
                  setTransitionSymbols('')
                  setConnectionError('')
                }}
              >
                Add transition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
