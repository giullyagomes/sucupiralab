import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Receipt,
  MessageSquareText,
  FolderKanban,
  GraduationCap,
  BookOpen,
  LogOut,
  Menu,
  X,
  FlaskConical,
  Network,
  Globe,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/projetos', label: 'Projetos Financiados', icon: FolderKanban, color: 'text-yellow-600', activeBg: 'bg-yellow-100' },
  { to: '/orientacoes', label: 'Orientações', icon: GraduationCap, color: 'text-pink-600', activeBg: 'bg-pink-100' },
  { to: '/nucleacao', label: 'Nucleação', icon: Network, color: 'text-orange-600', activeBg: 'bg-orange-100' },
  { to: '/producao', label: 'Produção Científica', icon: BookOpen, color: 'text-teal-600', activeBg: 'bg-teal-100' },
  { to: '/internacionalizacao', label: 'Internacionalização', icon: Globe, color: 'text-indigo-600', activeBg: 'bg-indigo-100' },
  { to: '/discursos', label: 'Discursos Qualificados', icon: MessageSquareText, color: 'text-green-600', activeBg: 'bg-green-100' },
  { to: '/prestacoes', label: 'Prestações de Contas', icon: Receipt, color: 'text-blue-600', activeBg: 'bg-blue-100' },
]

function SidebarContent({
  onClose,
  onToggleDesktop,
}: {
  onClose?: () => void
  onToggleDesktop?: () => void
}) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const displayName = user?.displayName ?? user?.email ?? 'Usuário'
  const email = user?.email ?? ''
  const avatarUrl = user?.photoURL ?? ''
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              SucupiraLAB
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              coLAB/UFF
            </div>
          </div>
        </div>

        {/* Botão de fechar */}
        {(onClose || onToggleDesktop) && (
          <button
            onClick={onClose ?? onToggleDesktop}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, color, activeBg }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? cn(activeBg, color)
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center',
                    isActive ? 'bg-white/70' : 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? color : 'text-gray-500')} />
                </div>
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
              {displayName}
            </p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>

          <button onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      {/* DESKTOP */}
      <div
        className={cn(
          'hidden lg:flex h-screen sticky top-0 transition-all duration-300',
          desktopOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <SidebarContent onToggleDesktop={() => setDesktopOpen(false)} />
      </div>

      {/* BOTÃO para abrir quando fechado */}
      {!desktopOpen && (
        <button
          onClick={() => setDesktopOpen(true)}
          className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 border rounded-lg shadow"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <FlaskConical className="w-4 h-4" />
          <span className="font-bold">SucupiraLAB</span>
        </div>

        <button onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 w-64">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}