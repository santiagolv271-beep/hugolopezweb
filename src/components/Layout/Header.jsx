import React, { useState, useRef, useEffect } from 'react'
import useStore from '../../store/useStore'
import { Bell, Search, X, CheckCheck, Package, TrendingDown, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { timeAgo } from '../../utils/helpers'

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  inventory: 'Inventario',
  sales: 'Punto de Venta',
  purchases: 'Compras',
  suppliers: 'Proveedores',
  reports: 'Reportes',
  ai: 'Asistente IA',
  alerts: 'Alertas',
  settings: 'Configuración',
}

const NotifIcon = ({ type }) => {
  if (type === 'success') return <CheckCircle size={16} className="text-green-500" />
  if (type === 'error') return <X size={16} className="text-red-500" />
  if (type === 'warning') return <AlertTriangle size={16} className="text-yellow-500" />
  return <Info size={16} className="text-blue-500" />
}

export default function Header() {
  const { currentPage, setPage, notifications, markNotificationRead, clearNotifications, products, settings } = useStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const notifRef = useRef(null)
  const searchRef = useRef(null)

  const unread = notifications.filter(n => !n.read).length

  const searchResults = searchQuery.length > 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery)
      ).slice(0, 6)
    : []

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{PAGE_LABELS[currentPage] || 'StockMaster Pro'}</h1>
        <p className="text-xs text-gray-400">{settings.businessName}</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div ref={searchRef} className="relative">
          <button
            onClick={() => { setShowSearch(!showSearch); setTimeout(() => document.getElementById('header-search')?.focus(), 100) }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Search size={18} />
          </button>
          {showSearch && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-gray-400" />
                  <input
                    id="header-search"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto, SKU o código..."
                    className="flex-1 text-sm outline-none"
                  />
                  {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} className="text-gray-400" /></button>}
                </div>
              </div>
              {searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPage('inventory'); setShowSearch(false); setSearchQuery('') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku} · Stock: {p.stock}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 1 ? (
                <div className="p-4 text-center text-sm text-gray-400">Sin resultados</div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">Escribí para buscar...</div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Notificaciones</span>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <CheckCheck size={14} /> Limpiar
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">Sin notificaciones</div>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.time)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {settings.businessName?.charAt(0) || 'A'}
        </div>
      </div>
    </header>
  )
}
