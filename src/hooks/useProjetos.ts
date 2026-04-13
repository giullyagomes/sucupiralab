import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../service/client';
import type { ProjetoResponseDTO, ProjetoRequestDTO } from '../types'; // crie tipos baseados nos DTOs

// Tipos (crie em src/types/projeto.ts ou use os do backend via OpenAPI no futuro)
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

export const useProjetos = () => {
  return useQuery({
    queryKey: ['projetos'],
    queryFn: () => apiClient.get<ProjetoResponseDTO[]>('/projetos'),
  });
};

export const useCriarProjeto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ProjetoRequestDTO) => apiClient.post<ProjetoResponseDTO>('/projetos', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] }); // Atualiza lista automaticamente
    },
  });
};

// Similar para useAtualizarProjeto, useDeletarProjeto, useProjetoById, etc.