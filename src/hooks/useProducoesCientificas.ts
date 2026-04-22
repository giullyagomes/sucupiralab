import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ProducaoCientificaRequestDTO, ProducaoCientificaResponseDTO } from '../types/producaoCientifica';

export const useProducoesCientificas = () => {
  return useQuery({
    queryKey: ['producoesCientificas'],
    queryFn: () => apiClient.get<ProducaoCientificaResponseDTO[]>('/producoes-cientificas'),
  });
};

export const useCriarProducaoCientifica = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ProducaoCientificaRequestDTO) =>
      apiClient.post<ProducaoCientificaResponseDTO>('/producoes-cientificas', dto),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producoesCientificas'] });
    },

    onError: (error: Error | unknown) => {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao criar:', message);
      // alert(message); // ou use toast
    },
  });
};