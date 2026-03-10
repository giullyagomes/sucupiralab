import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Página não encontrada</h1>
      <p className="text-sm text-gray-500 mb-6">A rota solicitada não existe.</p>
      <Button asChild>
        <Link to="/prestacoes">Voltar ao início</Link>
      </Button>
    </div>
  )
}
