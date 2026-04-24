import React, { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import { formatCurrency, formatDate } from '../utils/helpers'
import { AlertTriangle, Package, Clock, TrendingDown, Bell, CheckCircle, ShoppingCart, Zap } from 'lucide-react'
import { subDays, parseISO } from 'date-fns'

const AlertCard = ({ type, title, description, items, color, icon: Icon, action, onAction }) => {
  const [expanded, setExpanded] = useState(true)
  const colors = {
    red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', title: 'text-red-900', badge: 'bg-red-500' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', title: 'text-yellow-900', badge: 'bg-yellow-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', title: 'text-orange-900', badge: 'bg-orange-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', title: 'text-blue-900', badge: 'bg-blue-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', title: 'text-purple-900', badge: 'bg-purple-500' },
  }
  const c = colors[color] || colors.yellow
  if (items.length === 0) return null
  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-4 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-sm ${c.title}`}>{title}</h3>
            <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{items.length}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/70 rounded-xl p-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100">
                <Package size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.detail}</p>
              </div>
              {item.badge && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${c.icon}`}>{item.badge}</span>
              )}
            </div>
          ))}
          {action && (
            <button onClick={onAction} className={`mt-2 w-full py-2 text-sm font-semibold rounded-xl text-white transition-colors ${c.badge} hover:opacity-90`}>
              {action}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Alerts() {
  const { products, sales, purchases, setPage, settings } = useStore()
  const sym = settings.currencySymbol

  // Out of stock
  const outOfStock = useMemo(() => products.filter(p => p.stock === 0).map(p => ({
    name: p.name,
    detail: `SKU: ${p.sku} · Proveedor: ${p.supplier || 'Sin asignar'}`,
    badge: 'AGOTADO'
  })), [products])

  // Low stock
  const lowStock = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= p.minStock).map(p => ({
    name: p.name,
    detail: `Stock: ${p.stock} ${p.unit} · Mínimo: ${p.minStock} · Reponer: ${p.minStock - p.stock + p.minStock}`,
    badge: `${p.stock}/${p.minStock}`
  })), [products])

  // Expiring soon
  const expiringSoon = useMemo(() => {
    const today = new Date()
    const soon = new Date(); soon.setDate(soon.getDate() + 30)
    return products.filter(p => p.expirationDate && new Date(p.expirationDate) <= soon).map(p => {
      const d = new Date(p.expirationDate)
      const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
      return {
        name: p.name,
        detail: `${daysLeft < 0 ? 'VENCIDO' : `Vence en ${daysLeft} días`} · ${formatDate(p.expirationDate)} · Stock: ${p.stock}`,
        badge: daysLeft < 0 ? 'VENCIDO' : `${daysLeft}d`
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  // Slow movers (no sales in 30 days)
  const recentProductIds = useMemo(() => {
    const cutoff = subDays(new Date(), 30)
    const ids = new Set()
    sales.filter(s => { try { return parseISO(s.date) >= cutoff } catch { return false } })
      .forEach(s => s.items?.forEach(i => ids.add(i.productId)))
    return ids
  }, [sales])

  const slowMovers = useMemo(() => products.filter(p => p.stock > 0 && !recentProductIds.has(p.id)).map(p => ({
    name: p.name,
    detail: `${p.stock} ${p.unit} sin movimiento · Valor: ${formatCurrency(p.costPrice * p.stock, sym)}`,
    badge: `${p.stock} en stock`
  })), [products, recentProductIds, sym])

  // Pending purchases
  const pendingPurchases = useMemo(() => purchases.filter(p => p.status === 'pendiente' || p.status === 'parcial').map(p => ({
    name: p.supplierName || 'Sin proveedor',
    detail: `${p.status === 'pendiente' ? 'Pendiente' : 'Parcial'} · Total: ${formatCurrency(p.total, sym)} · Esperado: ${formatDate(p.expectedDate)}`,
    badge: p.status
  })), [purchases, sym])

  // Overstock (stock >= maxStock)
  const overstock = useMemo(() => products.filter(p => p.maxStock && p.stock >= p.maxStock).map(p => ({
    name: p.name,
    detail: `Stock: ${p.stock} ${p.unit} · Máximo: ${p.maxStock} · Exceso: ${p.stock - p.maxStock}`,
    badge: `+${p.stock - p.maxStock}`
  })), [products])

  const totalAlerts = outOfStock.length + lowStock.length + expiringSoon.length + pendingPurchases.length

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sin stock', value: outOfStock.length, color: outOfStock.length > 0 ? 'text-red-700' : 'text-gray-400', bg: outOfStock.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100' },
          { label: 'Stock bajo', value: lowStock.length, color: lowStock.length > 0 ? 'text-yellow-700' : 'text-gray-400', bg: lowStock.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100' },
          { label: 'Por vencer', value: expiringSoon.length, color: expiringSoon.length > 0 ? 'text-orange-700' : 'text-gray-400', bg: expiringSoon.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100' },
          { label: 'Sin movimiento', value: slowMovers.length, color: slowMovers.length > 0 ? 'text-purple-700' : 'text-gray-400', bg: slowMovers.length > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-100' },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {totalAlerts === 0 && outOfStock.length === 0 && lowStock.length === 0 && expiringSoon.length === 0 ? (
        <div className="bg-white rounded-2xl border border-green-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo en orden!</h3>
          <p className="text-gray-500">No hay alertas activas en este momento. Tu inventario está bien gestionado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AlertCard
            type="out"
            color="red"
            icon={Zap}
            title="Productos sin stock"
            description="Estos productos están agotados y representan ventas perdidas"
            items={outOfStock}
            action={outOfStock.length > 0 ? "Crear orden de compra →" : null}
            onAction={() => setPage('purchases')}
          />
          <AlertCard
            type="low"
            color="yellow"
            icon={AlertTriangle}
            title="Stock bajo"
            description="Productos que están por debajo del nivel mínimo configurado"
            items={lowStock}
            action={lowStock.length > 0 ? "Ver inventario →" : null}
            onAction={() => setPage('inventory')}
          />
          <AlertCard
            type="expiring"
            color="orange"
            icon={Clock}
            title="Productos próximos a vencer"
            description="Vencen en los próximos 30 días - tomá acción ahora"
            items={expiringSoon}
          />
          <AlertCard
            type="pending"
            color="blue"
            icon={ShoppingCart}
            title="Órdenes de compra pendientes"
            description="Compras que están pendientes de recibir"
            items={pendingPurchases}
            action={pendingPurchases.length > 0 ? "Ver compras →" : null}
            onAction={() => setPage('purchases')}
          />
          <AlertCard
            type="slow"
            color="purple"
            icon={TrendingDown}
            title="Sin movimiento (30 días)"
            description="Productos con stock que no se vendieron en el último mes"
            items={slowMovers}
          />
          <AlertCard
            type="over"
            color="blue"
            icon={Package}
            title="Sobrestock"
            description="Productos que superan el nivel máximo configurado"
            items={overstock}
          />
        </div>
      )}
    </div>
  )
}
