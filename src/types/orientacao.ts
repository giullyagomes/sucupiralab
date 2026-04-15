export interface OrientacaoRequestDTO {
  nomeDiscente: string;
  matriculaDiscente?: string;
  nivel: string;                    // "GRADUACAO" | "MESTRADO" | "DOUTORADO" | "POS_DOUTORADO"
  tituloTrabalho: string;
  tema?: string;
  dataInicio?: string;              // YYYY-MM-DD
  dataPrevistaDefesa?: string;
  orientador?: string;
  status?: string;
}

export interface OrientacaoResponseDTO {
  id: string;
  nomeDiscente: string;
  matriculaDiscente?: string;
  nivel: string;
  tituloTrabalho: string;
  tema?: string;
  dataInicio?: string;
  dataPrevistaDefesa?: string;
  orientador?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}