import { createContext, useContext, useMemo, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react'
import { templates } from '../data/templates'
import type { AutomataDefinition } from '../types'

type AutomataStoreValue = {
  definition: AutomataDefinition
  setDefinition: Dispatch<SetStateAction<AutomataDefinition>>
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const AutomataStoreContext = createContext<AutomataStoreValue | null>(null)

export function AutomataStoreProvider({ children }: PropsWithChildren) {
  const [definition, setDefinition] = useState<AutomataDefinition>(clone(templates['DFA - Ends with 1']))
  const value = useMemo(() => ({ definition, setDefinition }), [definition])
  return <AutomataStoreContext.Provider value={value}>{children}</AutomataStoreContext.Provider>
}

export function useAutomataStore() {
  const ctx = useContext(AutomataStoreContext)
  if (!ctx) {
    throw new Error('useAutomataStore must be used within AutomataStoreProvider')
  }
  return ctx
}

