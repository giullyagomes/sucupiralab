export interface ProducaoCientificaRequestDTO {
  titulo: string;
  tipo: string;                    // "ARTIGO_JOURNAL" | "ARTIGO_CONGRESSO" | "LIVRO" | ...
  autores?: string;
  revistaOuEditora?: string;
  doi?: string;
  link?: string;
  ano: number;
  dataPublicacao?: string;         // YYYY-MM-DD
  projetoRelacionado?: string;
  qualis?: string;                 // "A1" | "A2" | ...
}

export interface ProducaoCientificaResponseDTO {
  id: string;
  titulo: string;
  tipo: string;
  autores?: string;
  revistaOuEditora?: string;
  doi?: string;
  link?: string;
  ano: number;
  dataPublicacao?: string;
  projetoRelacionado?: string;
  qualis?: string;
  createdAt: string;
  updatedAt: string;
}