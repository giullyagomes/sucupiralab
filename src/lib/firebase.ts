// ─── Firebase Auth — lazy initialisation ─────────────────────────────────
// Firebase is initialised at startup from /config.json (via src/lib/config.ts).
// If the config file is empty/absent, the app runs in PAT-only / demo mode.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { type FirebaseConfig } from './config'

let _auth: Auth | undefined
let _googleProvider: GoogleAuthProvider | undefined
let _ready = false

/**
 * Call once (from main.tsx) after loadRuntimeConfig() resolves.
 * Safe to call with undefined — becomes a no-op.
 */
export function initFirebaseFromConfig(cfg: FirebaseConfig | undefined): void {
  if (!cfg) return
  const app: FirebaseApp =
    getApps().length === 0 ? initializeApp(cfg) : getApps()[0]
  _auth = getAuth(app)
  _googleProvider = new GoogleAuthProvider()
  _googleProvider.setCustomParameters({ prompt: 'select_account' })
  _ready = true
}

/** true after a valid Firebase config was provided */
export function isFirebaseReady(): boolean {
  return _ready
}

export function getFirebaseAuth(): Auth | undefined {
  return _auth
}

export function getGoogleProvider(): GoogleAuthProvider | undefined {
  return _googleProvider
}
