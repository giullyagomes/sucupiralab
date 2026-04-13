export interface ProjetoResponseDTO { 
    id: number;
    titulo: string;
    edital: string;
    agenciaFomento: string;
    valorConcedido: number;
    dataInicio: Date; 
    dataFim: Date; 
    coordenador: string;
    equipe: string[];
    descricao: string;
    linkLattesOuGitHub: string;
    status: 'Em Andamento' | 'Concluído' | 'Cancelado';
    createdAt: Date;
    updatedAt: Date;
 }
export interface ProjetoRequestDTO { 
    titulo: string;
    edital: string;
    agenciaFomento: string;
    valorConcedido: number;
    dataInicio: Date; 
    dataFim: Date; 
    coordenador: string;
    equipe: string[];
    descricao: string;
    linkLattesOuGitHub: string;
 }