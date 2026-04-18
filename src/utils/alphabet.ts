import type { AutomataModel } from '../types'

/**
 * Parse a comma-separated alphabet string: trim tokens, drop empties, dedupe (first occurrence wins).
 */
export function parseAlphabet(input: string): string[] {
  return input
    .split(',')
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0)
    .filter((symbol, index, self) => self.indexOf(symbol) === index)
}

export function formatAlphabetLabel(symbols: string[]): string {
  if (symbols.length === 0) return '∅'
  return `{${symbols.join(', ')}}`
}

/**
 * Each symbol must be exactly one character. Epsilon (ε) is allowed only for NFA and PDA alphabets.
 */
export function validateAlphabetSymbols(symbols: string[], model: AutomataModel): string | null {
  if (symbols.length === 0) {
    return 'Enter at least one symbol. Separate symbols with commas (for example: 0,1 or a,b).'
  }

  for (const symbol of symbols) {
    if (symbol.length !== 1) {
      return `Symbol "${symbol}" must be exactly one character. Use commas between symbols (e.g. "a,b" not "ab").`
    }
  }

  if (model === 'DFA' || model === 'TM') {
    if (symbols.includes('ε')) {
      return 'The epsilon character (ε) cannot be in a DFA or TM alphabet. Switch to NFA or PDA, or remove ε.'
    }
  }

  return null
}
