import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'

interface RoleRouteProps {
  allowed: string[]
  children: React.ReactNode
}

export function RoleRoute({ allowed, children }: RoleRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/nao-autorizado" replace />
  }

  return <>{children}</>
}