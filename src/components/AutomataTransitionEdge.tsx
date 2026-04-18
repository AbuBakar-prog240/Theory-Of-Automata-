import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from 'reactflow'

export type AutomataTransitionEdgeData = {
  label: string
  isActive?: boolean
  curveOffset?: number
  isSelfLoop?: boolean
  canEdit?: boolean
  onEditLabel?: () => void
  stroke?: string
  activeStroke?: string
}

export function AutomataTransitionEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  style,
  data,
  interactionWidth = 22,
}: EdgeProps<AutomataTransitionEdgeData>) {
  const isSelfLoop = data?.isSelfLoop ?? source === target
  const base = data?.stroke ?? '#64748b'
  const active = data?.activeStroke ?? '#4f46e5'
  const strokeColor = data?.isActive ? active : base

  const labelClassName = [
    'pointer-events-auto absolute rounded-lg border px-2 py-1 text-xs font-semibold shadow-md backdrop-blur-sm transition-colors',
    data?.isActive
      ? 'border-indigo-300/80 bg-white text-indigo-900 dark:border-indigo-500/50 dark:bg-indigo-950/90 dark:text-indigo-100'
      : 'border-slate-200/90 bg-white/95 text-slate-800 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100',
    data?.canEdit ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-400 dark:hover:bg-indigo-950/80' : '',
  ].join(' ')

  if (isSelfLoop) {
    const controlOffset = 72
    const path = `M ${sourceX} ${sourceY} C ${sourceX + 40} ${sourceY - controlOffset}, ${targetX - 40} ${targetY - controlOffset}, ${targetX} ${targetY}`
    const labelX = (sourceX + targetX) / 2
    const labelY = sourceY - controlOffset - 10

    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={{ stroke: strokeColor, strokeWidth: data?.isActive ? 2.5 : 2, ...style }}
          interactionWidth={interactionWidth}
        />
        <EdgeLabelRenderer>
          <div
            className={labelClassName}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: data?.canEdit ? 'all' : 'none',
            }}
            onClick={data?.onEditLabel}
            title={data?.canEdit ? 'Click to edit labels' : undefined}
          >
            {data?.label}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.max(Math.hypot(dx, dy), 1)
  const normalX = -dy / length
  const normalY = dx / length
  const curveOffset = data?.curveOffset ?? 0
  const controlX = (sourceX + targetX) / 2 + normalX * curveOffset
  const controlY = (sourceY + targetY) / 2 + normalY * curveOffset
  const edgePath = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`
  const labelX = (sourceX + targetX + controlX) / 3
  const labelY = (sourceY + targetY + controlY) / 3

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{ stroke: strokeColor, strokeWidth: data?.isActive ? 2.5 : 2, ...style }}
        interactionWidth={interactionWidth}
      />
      <EdgeLabelRenderer>
        <div
          className={labelClassName}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: data?.canEdit ? 'all' : 'none',
          }}
          onClick={data?.onEditLabel}
          title={data?.canEdit ? 'Click to edit labels' : undefined}
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
