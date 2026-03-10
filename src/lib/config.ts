// ─── Runtime configuration ────────────────────────────────────────────────
// Config is loaded from /config.json at startup so users can configure the
// app by editing a single file — no rebuild or environment variables needed.

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
}

export interface RuntimeConfig {
  firebase?: FirebaseConfig
}

let _config: RuntimeConfig = {}

export async function loadRuntimeConfig(): Promise<void> {
  try {
    // Use a cache-busting query string so browsers always fetch the latest version
    const res = await fetch('./config.json?v=' + Date.now())
    if (!res.ok) return
    const raw: RuntimeConfig & { _instrucoes?: string } = await res.json()

    // Validate Firebase block: only use it when the required fields are non-empty
    const fb = raw.firebase
    if (fb?.apiKey?.trim() && fb?.projectId?.trim() && fb?.authDomain?.trim()) {
      _config = { firebase: fb }
    }
  } catch {
    // config.json absent or malformed — run without Firebase (PAT-only mode)
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return _config
}

export function isFirebaseConfigured(): boolean {
  return !!_config.firebase
}
