import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from 'reactflow'

export type AutomataStateNodeData = {
  label: string
  isStart?: boolean
  isAccept?: boolean
  isActive?: boolean
  hasValidationError?: boolean
  /** Typical trap from “Auto-complete” — dashed, muted styling */
  isTrap?: boolean
}

export function AutomataStateNode({ data, selected }: NodeProps<AutomataStateNodeData>) {
  const isTrap = data.isTrap ?? false

  return (
    <motion.div
      className="relative flex items-center justify-center outline-none"
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{
        scale: data.isActive ? 1.06 : selected ? 1.03 : 1,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      whileHover={{ scale: data.isActive ? 1.06 : 1.04 }}
      whileTap={{ scale: 0.98 }}
    >
      {data.isStart && (
        <motion.div
          className="absolute -left-11 top-1/2 flex w-9 -translate-y-1/2 items-center"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          aria-hidden
        >
          <span className="h-0.5 flex-1 rounded-full bg-gradient-to-r from-transparent to-indigo-500 dark:to-indigo-400" />
          <span className="ml-px border-b-[6px] border-l-[10px] border-t-[6px] border-b-transparent border-l-indigo-600 border-t-transparent dark:border-l-indigo-400" />
        </motion.div>
      )}

      <div
        className={[
          'font-display relative flex h-[5.25rem] w-[5.25rem] select-none items-center justify-center rounded-full text-center text-sm font-semibold tracking-tight shadow-lg transition-shadow duration-300',
          isTrap
            ? 'border-2 border-dashed border-slate-400 bg-slate-100 text-slate-600 ring-1 ring-slate-300/60 dark:border-slate-500 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-600/50'
            : data.hasValidationError
              ? 'border-[3px] border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-200 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-500/30'
              : data.isActive
                ? 'border-[3px] border-amber-500 bg-amber-50 text-amber-950 shadow-[0_0_0_4px_rgb(251_191_36/0.35),0_12px_40px_-8px_rgb(245_158_11/0.45)] dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-50 dark:shadow-[0_0_0_4px_rgb(251_191_36/0.2),0_12px_40px_-8px_rgb(245_158_11/0.25)]'
                : data.isAccept
                  ? 'border-2 border-emerald-600 bg-white text-emerald-950 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-white dark:border-emerald-400 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-400/35 dark:ring-offset-slate-900'
                  : 'border-2 border-indigo-500/80 bg-white text-slate-800 ring-1 ring-indigo-500/15 dark:border-indigo-400/70 dark:bg-slate-800 dark:text-slate-100 dark:ring-indigo-400/20',
        ].join(' ')}
      >
        {data.isAccept && !isTrap ? (
          <span className="flex h-[3.55rem] w-[3.55rem] items-center justify-center rounded-full border-2 border-emerald-700/85 bg-emerald-50/90 text-center leading-tight dark:border-emerald-400 dark:bg-emerald-950/50">
            {data.label}
          </span>
        ) : (
          <span className="px-1">{data.label}</span>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-indigo-500 !shadow-md dark:!border-slate-900 dark:!bg-indigo-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-indigo-500 !shadow-md dark:!border-slate-900 dark:!bg-indigo-400"
      />
      <Handle
        type="source"
        id="loop-source"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-indigo-500 !shadow-md dark:!border-slate-900 dark:!bg-indigo-400"
      />
      <Handle
        type="target"
        id="loop-target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-indigo-500 !shadow-md dark:!border-slate-900 dark:!bg-indigo-400"
      />
    </motion.div>
  )
}
