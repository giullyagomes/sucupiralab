export interface ProjetoResponseDTO { 
    id: string;
    titulo: string;
    edital?: string;
    agenciaFomento?: string;
    valorConcedido: number;
    dataInicio?: Date; 
    dataFim?: Date; 
    coordenador?: string;
    equipe?: string;
    descricao?: string;
    linkLattesOuGitHub?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
 }
export interface ProjetoRequestDTO { 
    titulo: string;
    edital?: string;
    agenciaFomento?: string;
    valorConcedido: number;
    dataInicio?: Date; 
    dataFim?: Date; 
    coordenador?: string;
    equipe?: string;
    descricao?: string;
    linkLattesOuGitHub?: string;
 }