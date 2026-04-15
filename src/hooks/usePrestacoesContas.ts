import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { PrestacaoContasRequestDTO, PrestacaoContasResponseDTO } from '../types/prestacaoContas';

export const usePrestacoesContas = () => {
  return useQuery({
    queryKey: ['prestacoesContas'],
    queryFn: () => apiClient.get<PrestacaoContasResponseDTO[]>('/prestacoes-contas'),
  });
};

export const useCriarPrestacaoContas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: PrestacaoContasRequestDTO) =>
      apiClient.post<PrestacaoContasResponseDTO>('/prestacoes-contas', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestacoesContas'] });
    },
  });
};