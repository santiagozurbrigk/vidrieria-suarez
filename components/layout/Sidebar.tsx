'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/',             label: 'Inicio',        icon: '🏠' },
  { href: '/stock',        label: 'Stock',          icon: '📦' },
  { href: '/proveedores',  label: 'Proveedores',    icon: '🏭' },
  { href: '/compras',      label: 'Compras',         icon: '🛒' },
  { href: '/precios',      label: 'Lista de Precios', icon: '💲' },
  { href: '/ventas',        label: 'Ventas',          icon: '🧾' },
  { href: '/presupuestos', label: 'Presupuestos',   icon: '📄' },
  { href: '/remitos',      label: 'Remitos',        icon: '🚚' },
  { href: '/clientes',     label: 'Clientes',       icon: '👥' },
  { href: '/arquitectos',  label: 'Arquitectos',    icon: '📐' },
  { href: '/pagos',        label: 'Pagos',          icon: '💳' },
  { href: '/caja',         label: 'Caja',           icon: '💰' },
  { href: '/gastos',       label: 'Gastos',         icon: '📋' },
]

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-xl">
          🪟
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Vidriería</p>
          <p className="text-xs text-gray-400">Suárez</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-semibold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm text-gray-300">{userName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
