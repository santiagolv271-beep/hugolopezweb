import React, { useMemo } from 'react'
import useStore from '../store/useStore'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import {
  TrendingUp, TrendingDown, Package, ShoppingCart, AlertTriangle,
  DollarSign, Boxes, Users, ArrowUpRight, ArrowDownRight, Eye
} from 'lucide-react'
import { format, subDays, parseISO, startOfDay, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency, calcMargin } from '../utils/helpers'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']

const KPICard = ({ title, value, sub, icon: Icon, color, trend, trendValue }) => {
  const colorMap = {
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-100' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',   border: 'border-green-100' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', border: 'border-yellow-100' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',       border: 'border-red-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',     border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-100' },
  }
  const c = colorMap[color] || colorMap.indigo

  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${c.icon}`}>
          <Icon size={22} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend === 'up' ? (
            <ArrowUpRight size={14} className="text-green-500" />
          ) : (
            <ArrowDownRight size={14} className="text-red-500" />
          )}
          <span className={`text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trendValue}
          </span>
          <span className="text-xs text-gray-400">vs ayer</span>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
        <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            {currency ? formatCurrency(entry.value) : entry.value} {entry.name !== 'value' ? entry.name : ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { products, sales, purchases, suppliers, getLowStockProducts, getOutOfStockProducts, getExpiringProducts, settings } = useStore()
  const sym = settings.currencySymbol

  // KPIs
  const today = new Date()
  const todaySales = useMemo(() => sales.filter(s => {
    try { return isSameDay(parseISO(s.date), today) } catch { return false }
  }), [sales])

  const yesterdaySales = useMemo(() => sales.filter(s => {
    try { return isSameDay(parseISO(s.date), subDays(today, 1)) } catch { return false }
  }), [sales])

  const todayRevenue = todaySales.reduce((s, v) => s + v.total, 0)
  const yesterdayRevenue = yesterdaySales.reduce((s, v) => s + v.total, 0)
  const revenueTrend = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(0) : 0

  const inventoryValue = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0)
  const lowStock = getLowStockProducts()
  const outOfStock = getOutOfStockProducts()
  const expiring = getExpiringProducts(30)

  // Last 14 days sales chart
  const salesChartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(today, 13 - i)
      const daySales = sales.filter(s => {
        try { return isSameDay(parseISO(s.date), date) } catch { return false }
      })
      return {
        date: format(date, 'dd/MM', { locale: es }),
        ventas: daySales.reduce((sum, s) => sum + s.total, 0),
        cantidad: daySales.length,
      }
    })
  }, [sales])

  // Category distribution
  const categoryData = useMemo(() => {
    const cats = {}
    products.forEach(p => {
      cats[p.category] = (cats[p.category] || 0) + (p.costPrice * p.stock)
    })
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [products])

  // Top products by sales
  const topProducts = useMemo(() => {
    const prods = {}
    sales.forEach(s => {
      s.items?.forEach(item => {
        prods[item.name] = (prods[item.name] || 0) + item.total
      })
    })
    return Object.entries(prods)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }))
  }, [sales])

  // Stock levels chart
  const stockChart = useMemo(() => {
    const cats = {}
    products.forEach(p => {
      if (!cats[p.category]) cats[p.category] = { category: p.category, stock: 0, minStock: 0 }
      cats[p.category].stock += p.stock
      cats[p.category].minStock += p.minStock
    })
    return Object.values(cats).slice(0, 7)
  }, [products])

  // Payment method distribution
  const paymentData = useMemo(() => {
    const pays = {}
    sales.slice(0, 100).forEach(s => {
      pays[s.payment] = (pays[s.payment] || 0) + 1
    })
    return Object.entries(pays).map(([name, value]) => ({ name, value }))
  }, [sales])

  const week7Revenue = sales.filter(s => {
    try { return parseISO(s.date) >= subDays(today, 7) } catch { return false }
  }).reduce((sum, s) => sum + s.total, 0)

  const month30Revenue = sales.filter(s => {
    try { return parseISO(s.date) >= subDays(today, 30) } catch { return false }
  }).reduce((sum, s) => sum + s.total, 0)

  const pendingPurchases = purchases.filter(p => p.status === 'pendiente' || p.status === 'parcial').length

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Ventas hoy"
          value={formatCurrency(todayRevenue, sym)}
          sub={`${todaySales.length} transacciones`}
          icon={ShoppingCart}
          color="indigo"
          trend={revenueTrend >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(revenueTrend)}%`}
        />
        <KPICard
          title="Semana (7d)"
          value={formatCurrency(week7Revenue, sym)}
          sub="Últimos 7 días"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Mes (30d)"
          value={formatCurrency(month30Revenue, sym)}
          sub="Últimos 30 días"
          icon={DollarSign}
          color="purple"
        />
        <KPICard
          title="Valor inventario"
          value={formatCurrency(inventoryValue, sym)}
          sub={`${products.length} productos`}
          icon={Boxes}
          color="blue"
        />
        <KPICard
          title="Alertas stock"
          value={lowStock.length + outOfStock.length}
          sub={`${outOfStock.length} sin stock`}
          icon={AlertTriangle}
          color={outOfStock.length > 0 ? 'red' : 'yellow'}
        />
        <KPICard
          title="Proveedores"
          value={suppliers.length}
          sub={`${pendingPurchases} compras pend.`}
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales area chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Ventas últimos 14 días</h3>
              <p className="text-xs text-gray-400">Ingresos diarios</p>
            </div>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {formatCurrency(salesChartData.reduce((s, d) => s + d.ventas, 0), sym)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesChartData}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip currency />} />
              <Area type="monotone" dataKey="ventas" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorVentas)" name="Ingresos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Inventario por categoría</h3>
            <p className="text-xs text-gray-400">Valor en stock</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [formatCurrency(v, sym), 'Valor']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {categoryData.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 truncate max-w-[110px]">{cat.name}</span>
                </div>
                <span className="text-gray-500 font-medium">{formatCurrency(cat.value, sym)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Top 5 productos</h3>
            <p className="text-xs text-gray-400">Por ingresos totales</p>
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => {
              const maxVal = topProducts[0]?.total || 1
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm text-gray-700 truncate max-w-[160px]">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.total, sym)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${(p.total / maxVal) * 100}%`, backgroundColor: COLORS[i] }}
                    />
                  </div>
                </div>
              )
            })}
            {topProducts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
            )}
          </div>
        </div>

        {/* Stock by category bar chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Stock por categoría</h3>
              <p className="text-xs text-gray-400">Unidades actuales vs mínimo</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stockChart} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="stock" name="Stock actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="minStock" name="Stock mínimo" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts & Recent sales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Alertas activas</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {outOfStock.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900 truncate">{p.name}</p>
                  <p className="text-xs text-red-600">Sin stock · SKU: {p.sku}</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">AGOTADO</span>
              </div>
            ))}
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={14} className="text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-900 truncate">{p.name}</p>
                  <p className="text-xs text-yellow-700">Stock: {p.stock} · Mínimo: {p.minStock}</p>
                </div>
                <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full flex-shrink-0">BAJO</span>
              </div>
            ))}
            {expiring.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={14} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-900 truncate">{p.name}</p>
                  <p className="text-xs text-orange-700">Vence: {p.expirationDate}</p>
                </div>
                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full flex-shrink-0">POR VENCER</span>
              </div>
            ))}
            {outOfStock.length === 0 && lowStock.length === 0 && expiring.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package size={20} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-500">¡Todo en orden! Sin alertas activas</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent sales */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Últimas ventas</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sales.slice(0, 8).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {s.items?.length || 0} {s.items?.length === 1 ? 'artículo' : 'artículos'}
                  </p>
                  <p className="text-xs text-gray-400">{s.payment} · {s.date?.substring(0, 16)?.replace('T', ' ')}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(s.total, sym)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment methods + Quick stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Medios de pago</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={paymentData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {paymentData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary cards */}
        <div className="xl:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: 'Ticket promedio hoy', value: todaySales.length ? formatCurrency(todayRevenue / todaySales.length, sym) : `${sym}0`, color: 'bg-indigo-500' },
            { label: 'Margen promedio', value: `${(products.reduce((s, p) => s + parseFloat(calcMargin(p.costPrice, p.salePrice)), 0) / (products.length || 1)).toFixed(1)}%`, color: 'bg-green-500' },
            { label: 'Productos críticos', value: `${outOfStock.length + lowStock.length}`, color: 'bg-red-500' },
            { label: 'Compras pendientes', value: `${purchases.filter(p => p.status === 'pendiente').length}`, color: 'bg-yellow-500' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className={`w-3 h-12 rounded-full ${item.color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
