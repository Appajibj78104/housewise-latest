import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './config/queryClient'
import './index.css'
import './styles/theme.css'
import './styles/landing.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope)
        // Check for updates every 60 minutes
        setInterval(() => reg.update(), 60 * 60 * 1000)
      })
      .catch(err => console.log('SW registration failed:', err))
  })
}
