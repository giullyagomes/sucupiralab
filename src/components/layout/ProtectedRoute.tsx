import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemoMode, githubReady } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  // Allow access when in demo mode OR when a GitHub repo is configured.
  // A user logged in with Google but without a GitHub config stays on /login.
  if (!user || (!isDemoMode && !githubReady)) return <Navigate to="/login" replace />
  return <>{children}</>
}
