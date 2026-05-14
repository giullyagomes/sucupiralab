import { apiPost } from './client'

export interface LoginRequestDTO {
  email: string
  senha: string
}

export interface LoginResponseDTO {
  token: string
  email: string
  nomeCompleto: string
  role: string
}

export async function loginApi(
  data: LoginRequestDTO,
): Promise<LoginResponseDTO> {
  return apiPost<LoginResponseDTO>('/auth/login', data)
}

export async function registerApi(
  data: {
    nomeCompleto: string
    email: string
    senha: string
    confirmarSenha: string
  },
): Promise<LoginResponseDTO> {
  return apiPost<LoginResponseDTO>('/auth/register', data)
}