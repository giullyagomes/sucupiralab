import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { OrientacaoRequestDTO, OrientacaoResponseDTO } from '../types/orientacao';

export const useOrientacoes = () => {
  return useQuery({
    queryKey: ['orientacoes'],
    queryFn: () => apiClient.get<OrientacaoResponseDTO[]>('/orientacoes'),
  });
};

export const useCriarOrientacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: OrientacaoRequestDTO) =>
      apiClient.post<OrientacaoResponseDTO>('/orientacoes', dto),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orientacoes'] });
      // alert('Orientação criada com sucesso!'); // substitua por toast depois
    },

    onError: (error: any) => {
      console.error('Erro ao criar orientação:', error);
    },
  });
};