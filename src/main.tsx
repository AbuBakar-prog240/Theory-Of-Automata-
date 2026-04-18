import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AutomataStoreProvider } from './store/automataStore'
import { ThemeProvider } from './theme/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AutomataStoreProvider>
        <App />
      </AutomataStoreProvider>
    </ThemeProvider>
  </StrictMode>,
)
