import { useState } from 'react'
import type { LoginResponseDTO, RegisterRequestDTO } from '@/types/auth'
import { AuthContext } from './AuthContext'
import { loginApi, registerApi } from '@/api/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginResponseDTO | null>(() => {
    const stored = localStorage.getItem('auth')
    return stored ? JSON.parse(stored) : null
  })

  async function signIn(email: string, senha: string) {
    try {
      const data = await loginApi({ email, senha })
      localStorage.setItem('auth', JSON.stringify(data))
      localStorage.setItem('token', data.token)
      setUser(data)
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao entrar',
      }
    }
  }

  async function signUp(data: RegisterRequestDTO) {
    try {
      const result = await registerApi(data)
      localStorage.setItem('auth', JSON.stringify(result))
      localStorage.setItem('token', result.token)
      setUser(result)
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao cadastrar',
      }
    }
  }

  function logout() {
    localStorage.removeItem('auth')
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        isAuthenticated: !!user,
        signIn,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}