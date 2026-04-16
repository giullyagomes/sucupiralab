import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ProjetoRequestDTO, ProjetoResponseDTO } from '../types/projeto';

// listar todos os projetos (substitui o fetch antigo do GitHub)
export const useProjetos = () => {
  return useQuery({
    queryKey: ['projetos'],
    queryFn: () => apiClient.get<ProjetoResponseDTO[]>('/projetos'),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

// buscar um projeto específico por ID
export const useProjetoById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['projetos', id],
    queryFn: () => apiClient.get<ProjetoResponseDTO>(`/projetos/${id}`),
    enabled: !!id,
  });
};

// criar um novo projeto
export const useCriarProjeto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (novoProjeto: ProjetoRequestDTO) =>
      apiClient.post<ProjetoResponseDTO>('/projetos', novoProjeto),

    onSuccess: () => {
      // Depois de criar, atualiza automaticamente a lista de projetos
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      alert('Projeto criado com sucesso!');   // Temporário - usar toast
    },

    onError: (error: Error | unknown) => {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao criar:', message);
      // alert(message); // ou use toast
    },
  });
};

// atualizar projeto (você pode criar useAtualizarProjeto similarmente)
export const useAtualizarProjeto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: ProjetoRequestDTO }) =>
      apiClient.put<ProjetoResponseDTO>(`/projetos/${id}`, dados),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    },
  });
};

// deletar
export const useDeletarProjeto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/projetos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    },
  });
};