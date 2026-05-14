import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import { Login } from '@/pages/Login'
import { Prestacoes } from '@/pages/Prestacoes'
import { Discursos } from '@/pages/Discursos'
import { Projetos } from '@/pages/Projetos'
import { Orientacoes } from '@/pages/Orientacoes'
import { Nucleacao } from '@/pages/Nucleacao'
import { Producao } from '@/pages/Producao'
import { Internacionalizacao } from '@/pages/Internacionalizacao'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

export default function App() {
  return (
    <HashRouter>
      <Routes>

        {/* 🔓 pública */}
        <Route path="/login" element={<Login />} />

        {/* 🔒 área logada com layout */}
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

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </HashRouter>
  )
}