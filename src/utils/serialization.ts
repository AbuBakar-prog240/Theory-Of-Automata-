import html2canvas from 'html2canvas'
import type { AutomataDefinition } from '../types'

export const downloadJSON = (definition: AutomataDefinition) => {
  const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'automata.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

export const readJSONFile = (file: File): Promise<AutomataDefinition> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as AutomataDefinition
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })

export const exportCanvasAsPNG = async (element: HTMLElement | null) => {
  if (!element) return
  const canvas = await html2canvas(element, { backgroundColor: '#ffffff' })
  const image = canvas.toDataURL('image/png')
  const anchor = document.createElement('a')
  anchor.href = image
  anchor.download = 'automata-diagram.png'
  anchor.click()
}

export const downloadTextFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

