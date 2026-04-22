import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FlaskConical, Loader2, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthMode = 'login' | 'register'

function validateRegisterForm(params: {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}): string | null {
  const { fullName, email, password, confirmPassword } = params

  if (!fullName.trim()) return 'Informe seu nome completo.'
  if (!email.trim()) return 'Informe seu email.'
  if (!email.includes('@')) return 'Informe um email válido.'
  if (!password) return 'Informe uma senha.'
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!confirmPassword) return 'Confirme sua senha.'
  if (password !== confirmPassword) return 'A confirmação da senha não confere.'

  return null
}

export function Login() {
  const { user, loading, isAuthenticated, isDemoMode, signIn, signUp } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && (isAuthenticated || isDemoMode || user)) {
    return <Navigate to="/prestacoes" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'register') {
      const validationError = validateRegisterForm({
        fullName,
        email,
        password,
        confirmPassword,
      })
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setSubmitting(true)

    const result =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp({
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            confirmPassword,
          })

    setSubmitting(false)

    if (!result.ok) {
      setError(result.error ?? 'Não foi possível concluir a autenticação.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
              <FlaskConical className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              SucupiraLAB
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              App de gestão acadêmica · por coLAB/UFF
            </p>
          </div>

          {/* Toggle */}
          <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition
                ${mode === 'login'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-300'
                }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null) }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition
                ${mode === 'register'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-300'
                }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Nome completo</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login'
                  ? <LogIn className="w-4 h-4" />
                  : <UserPlus className="w-4 h-4" />
              }
              {submitting
                ? 'Processando...'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta'
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}