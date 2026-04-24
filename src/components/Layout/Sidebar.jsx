import React from 'react'
import useStore from '../../store/useStore'
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users,
  BarChart2, Bot, Bell, Settings, ChevronLeft, ChevronRight,
  TrendingUp, AlertTriangle, Boxes
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: null },
  { id: 'inventory', label: 'Inventario', icon: Package, section: 'Gestión' },
  { id: 'sales', label: 'Punto de Venta', icon: ShoppingCart, section: 'Gestión' },
  { id: 'purchases', label: 'Compras', icon: Truck, section: 'Gestión' },
  { id: 'suppliers', label: 'Proveedores', icon: Users, section: 'Gestión' },
  { id: 'reports', label: 'Reportes', icon: BarChart2, section: 'Análisis' },
  { id: 'ai', label: 'Asistente IA', icon: Bot, section: 'Análisis' },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle, section: 'Análisis' },
  { id: 'settings', label: 'Configuración', icon: Settings, section: 'Sistema' },
]

export default function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar, products, notifications, getLowStockProducts, getOutOfStockProducts } = useStore()

  const lowStock = getLowStockProducts().length
  const outOfStock = getOutOfStockProducts().length
  const alertCount = lowStock + outOfStock
  const unreadNotifs = notifications.filter(n => !n.read).length

  const getBadge = (id) => {
    if (id === 'alerts') return alertCount > 0 ? alertCount : null
    if (id === 'inventory') return outOfStock > 0 ? outOfStock : null
    return null
  }

  const sections = [...new Set(navItems.map(n => n.section))]

  return (
    <div className={`
      flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ease-in-out flex-shrink-0
      ${sidebarOpen ? 'w-64' : 'w-16'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 min-h-[64px]">
        {sidebarOpen && (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Boxes size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-base leading-tight block">StockMaster</span>
              <span className="text-indigo-400 text-xs font-medium">Pro</span>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <Boxes size={20} className="text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white ${!sidebarOpen ? 'hidden' : ''}`}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 scrollbar-thin">
        {sections.map((section) => (
          <div key={section}>
            {section && sidebarOpen && (
              <div className="px-4 pt-4 pb-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{section}</span>
              </div>
            )}
            {section && !sidebarOpen && <div className="border-t border-gray-700/50 my-2" />}
            {navItems.filter(n => n.section === section).map(item => {
              const Icon = item.icon
              const badge = getBadge(item.id)
              const active = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  title={!sidebarOpen ? item.label : ''}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150
                    relative group
                    ${active
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                    ${!sidebarOpen ? 'justify-center px-0' : ''}
                  `}
                >
                  <div className="relative flex-shrink-0">
                    <Icon size={18} />
                    {badge && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {sidebarOpen && badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {badge}
                    </span>
                  )}
                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md
                      opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {item.label}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Expand button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="p-3 flex justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border-t border-gray-700"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Bottom - inventory summary */}
      {sidebarOpen && (
        <div className="p-4 border-t border-gray-700">
          <div className="bg-gray-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Productos totales</span>
              <span className="text-white font-semibold">{products.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-yellow-400">Stock bajo</span>
              <span className="text-yellow-400 font-semibold">{lowStock}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-400">Sin stock</span>
              <span className="text-red-400 font-semibold">{outOfStock}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
