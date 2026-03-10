import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FbUser,
} from 'firebase/auth'
import { isFirebaseReady, getFirebaseAuth, getGoogleProvider } from '@/lib/firebase'
import {
  getGitHubConfig,
  saveGitHubConfig,
  clearGitHubConfig,
  isGitHubConfigured,
  setGitHubConfigKey,
  testConnection,
  type GitHubConfig,
} from '@/lib/github'

// ─── Shared user shape ────────────────────────────────────────────────────

export interface AppUser {
  id: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

// ─── Context type ─────────────────────────────────────────────────────────

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  /** true when data is read from in-memory demo set (no GitHub writes) */
  isDemoMode: boolean
  /** true when a GitHub PAT is configured and ready for reads/writes */
  githubReady: boolean
  /** true when Firebase is available (Google login is possible) */
  firebaseEnabled: boolean
  /** Sign in with Google (Firebase) or enter demo mode when Firebase is absent */
  signInWithGoogle: () => Promise<void>
  /** Validate and save GitHub credentials */
  configureGitHub: (
    cfg: Omit<GitHubConfig, 'branch'> & { branch?: string }
  ) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ─── Static user objects ──────────────────────────────────────────────────

const DEMO_USER: AppUser = {
  id: 'demo-user-id',
  email: 'demo@sucupiralab.app',
  displayName: 'Usuário Demo',
  photoURL: null,
}

function fbUserToAppUser(u: FbUser): AppUser {
  return {
    id: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [githubReady, setGithubReady] = useState(false)
  const [loading, setLoading] = useState(true)

  const firebaseEnabled = isFirebaseReady()

  useEffect(() => {
    const auth = getFirebaseAuth()

    if (!auth) {
      // ── No Firebase: legacy PAT-only flow ───────────────────────────────
      if (isGitHubConfigured()) {
        const cfg = getGitHubConfig()!
        setUser({
          id: 'github-user',
          email: `${cfg.owner}/${cfg.repo}`,
          displayName: 'GitHub User',
          photoURL: null,
        })
        setGithubReady(true)
      } else if (localStorage.getItem('sucupira_demo_logged_in') === 'true') {
        setUser(DEMO_USER)
      }
      setLoading(false)
      return
    }

    // ── Firebase available: watch auth state ────────────────────────────
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setGitHubConfigKey(fbUser.uid)
        setUser(fbUserToAppUser(fbUser))
        setGithubReady(isGitHubConfigured())
      } else {
        setGitHubConfigKey(null)
        setUser(null)
        setGithubReady(false)
      }
      setLoading(false)
    })

    return unsub
  }, [])

  const isDemoMode = user?.id === 'demo-user-id'

  // ── Actions ─────────────────────────────────────────────────────────────

  async function signInWithGoogle(): Promise<void> {
    const auth = getFirebaseAuth()
    const provider = getGoogleProvider()
    if (auth && provider) {
      await signInWithPopup(auth, provider)
      // onAuthStateChanged handles user update
    } else {
      // Demo mode fallback
      localStorage.setItem('sucupira_demo_logged_in', 'true')
      setUser(DEMO_USER)
      setGithubReady(false)
    }
  }

  async function configureGitHub(
    cfgInput: Omit<GitHubConfig, 'branch'> & { branch?: string }
  ): Promise<{ ok: boolean; error?: string }> {
    const full: GitHubConfig = { branch: 'main', ...cfgInput }
    const result = await testConnection(full)
    if (!result.ok) return result
    saveGitHubConfig(full)
    setGithubReady(true)
    if (!firebaseEnabled || !user) {
      setUser({
        id: 'github-user',
        email: `${full.owner}/${full.repo}`,
        displayName: 'GitHub User',
        photoURL: null,
      })
    }
    return { ok: true }
  }

  async function signOut(): Promise<void> {
    const auth = getFirebaseAuth()
    clearGitHubConfig()
    setGithubReady(false)
    if (auth) {
      await fbSignOut(auth)
      // onAuthStateChanged will set user to null
    } else {
      localStorage.removeItem('sucupira_demo_logged_in')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        githubReady,
        firebaseEnabled,
        signInWithGoogle,
        configureGitHub,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
