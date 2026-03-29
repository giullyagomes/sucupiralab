import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Prestacoes } from '@/pages/Prestacoes'
import { Discursos } from '@/pages/Discursos'
import { Projetos } from '@/pages/Projetos'
import { Orientacoes } from '@/pages/Orientacoes'
import { Nucleacao } from '@/pages/Nucleacao'
import { Producao } from '@/pages/Producao'
import { Internacionalizacao } from '@/pages/Internacionalizacao'
import { NotFound } from '@/pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/prestacoes" replace />} />
              <Route path="/prestacoes" element={<Prestacoes />} />
              <Route path="/discursos" element={<Discursos />} />
              <Route path="/projetos" element={<Projetos />} />
              <Route path="/orientacoes" element={<Orientacoes />} />
              <Route path="/nucleacao" element={<Nucleacao />} />
              <Route path="/producao" element={<Producao />} />
              <Route path="/internacionalizacao" element={<Internacionalizacao />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
