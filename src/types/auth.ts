export interface LoginRequestDTO {
  email: string;
  senha: string;
}

export interface RegisterRequestDTO {
  nomeCompleto: string;
  email: string;
  senha: string;
  confirmarSenha: string;
}

export interface LoginResponseDTO {
  token: string;
  email: string;
  nomeCompleto: string;
  role: string;
}