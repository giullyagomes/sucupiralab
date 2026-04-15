export interface PrestacaoContasRequestDTO {
  projetoId?: string;
  titulo: string;
  periodo?: string;
  valorPrestado: number;
  dataEnvio: string;           // YYYY-MM-DD
  observacoes?: string;
  arquivoComprovante?: string;
}

export interface PrestacaoContasResponseDTO {
  id: string;
  projetoId?: string;
  titulo: string;
  periodo?: string;
  valorPrestado: number;
  dataEnvio: string;
  status: string;
  observacoes?: string;
  arquivoComprovante?: string;
  createdAt: string;
  updatedAt: string;
}