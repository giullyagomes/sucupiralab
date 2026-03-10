import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadRuntimeConfig, getRuntimeConfig } from './lib/config'
import { initFirebaseFromConfig } from './lib/firebase'

async function bootstrap() {
  // 1. Fetch /config.json (user-editable, no rebuild needed)
  await loadRuntimeConfig()
  // 2. Initialise Firebase if the config contains valid credentials
  initFirebaseFromConfig(getRuntimeConfig().firebase)
  // 3. Render React
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
