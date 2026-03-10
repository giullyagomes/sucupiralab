import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FlaskConical, Github, KeyRound, Eye, EyeOff, LogIn, UserCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── GitHub config form (shared between two flows) ───────────────────────

function GitHubConfigForm({
  onSuccess,
  subtitle,
}: {
  onSuccess?: () => void
  subtitle?: string
}) {
  const { configureGitHub } = useAuth()
  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim() || !owner.trim() || !repo.trim()) {
      setError('Token, usuário e repositório são obrigatórios.')
      return
    }
    setError(null)
    setTesting(true)
    const result = await configureGitHub({
      token: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main',
    })
    setTesting(false)
    if (!result.ok) {
      setError(result.error ?? 'Não foi possível conectar. Verifique as credenciais.')
    } else {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}

      <div className="flex items-center gap-2">
        <Github className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700">Configurar repositório GitHub</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gh-token">Personal Access Token (PAT)</Label>
        <div className="relative">
          <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            id="gh-token"
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxx"
            className="pl-9 pr-9 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowToken((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Escopo mínimo: <code className="bg-gray-100 px-1 rounded">repo</code>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gh-owner">Usuário / Org</Label>
          <Input
            id="gh-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="seu-usuario"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gh-repo">Repositório</Label>
          <Input
            id="gh-repo"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="sucupira-dados"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gh-branch">
          Branch <span className="text-gray-400 font-normal">(padrão: main)</span>
        </Label>
        <Input
          id="gh-branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={testing}>
        <Github className="w-4 h-4" />
        {testing ? 'Conectando...' : 'Conectar e entrar'}
      </Button>
    </form>
  )
}

// ─── Main Login component ─────────────────────────────────────────────────

export function Login() {
  const { user, loading, isDemoMode, githubReady, firebaseEnabled, signInWithGoogle } = useAuth()

  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)

  // Already fully authenticated → go to dashboard
  if (!loading && (githubReady || isDemoMode)) {
    return <Navigate to="/prestacoes" replace />
  }

  async function handleGoogleSignIn() {
    setGoogleError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setGoogleError(err.message ?? 'Erro ao entrar com Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
              <FlaskConical className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SucupiraLAB</h1>
            <p className="text-sm text-gray-500 mt-1">Gestão acadêmica · dados no seu GitHub</p>
          </div>

          {/* ── Scenario A: Firebase user logged in, needs GitHub config ─── */}
          {user && !isDemoMode && !githubReady && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-800">
                    {user.displayName ?? user.email}
                  </p>
                  <p className="text-xs text-green-600 truncate">{user.email}</p>
                </div>
              </div>

              <GitHubConfigForm
                subtitle="Para salvar seus dados, conecte um repositório GitHub privado."
              />
            </div>
          )}

          {/* ── Scenario B: not logged in yet ─────────────────────────── */}
          {!user && (
            <>
              {/* Google Sign-In (when Firebase is configured) */}
              {firebaseEnabled && (
                <>
                  {googleError && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">{googleError}</p>
                    </div>
                  )}
                  <Button
                    className="w-full mb-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {/* Google SVG logo */}
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {googleLoading ? 'Entrando...' : 'Entrar com Google'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">ou</div>
                  </div>
                </>
              )}

              {/* PAT form (when Firebase is absent — standalone mode) */}
              {!firebaseEnabled && (
                <>
                  <GitHubConfigForm />
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">ou</div>
                  </div>
                </>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={signInWithGoogle}
              >
                <LogIn className="w-4 h-4" />
                Modo demonstração
              </Button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Dados fictícios, sem persistência.
              </p>
            </>
          )}
        </div>

        {/* Setup hint */}
        <div className="bg-white/80 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">Primeira configuração</p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            {firebaseEnabled && <li>Clique em <strong>Entrar com Google</strong> para se identificar.</li>}
            <li>Crie um repositório <strong>privado</strong> no GitHub para seus dados.</li>
            <li>
              Gere um PAT em <em>Settings → Developer settings → Personal access tokens</em>{' '}
              com escopo <code className="bg-gray-100 px-1 rounded">repo</code>.
            </li>
            <li>Preencha as credenciais e clique em Conectar.</li>
          </ol>
        </div>

        <p className="text-center text-xs text-gray-400">
          SucupiraLAB · dados armazenados no seu GitHub
        </p>
      </div>
    </div>
  )
}
