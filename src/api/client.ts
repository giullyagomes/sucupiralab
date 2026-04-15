const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

console.log(' Usando API em:', API_BASE_URL);  

export const apiClient = {
  // GET - buscar dados
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  // POST - criar novo registro
  post: async <T, B = Record<string, unknown>>(endpoint: string, body: B): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  // PUT - atualizar registro
  put: async <T, B = Record<string, unknown>>(endpoint: string, body: B): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  // DELETE - remover registro
  delete: async (endpoint: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }
  },
};