import { createContext } from 'react'
import type { LoginResponseDTO, RegisterRequestDTO } from '@/types/auth'

export interface AuthResult {
  ok: boolean
  error?: string
}

export interface AuthContextData {
  user: LoginResponseDTO | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, senha: string) => Promise<AuthResult>
  signUp: (data: RegisterRequestDTO) => Promise<AuthResult>
  logout: () => void
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined)