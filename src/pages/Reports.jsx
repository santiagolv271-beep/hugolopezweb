import React, { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, ScatterChart, Scatter
} from 'recharts'
import { format, subDays, parseISO, isSameDay, startOfWeek, getWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency, calcMargin, exportToCSV, groupBy } from '../utils/helpers'
import { BarChart2, Download, TrendingUp, Package, DollarSign, RotateCw } from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316']

const CustomTooltip = ({ active, payload, label, currency, sym }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-sm">
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color }} className="font-medium">
            {e.name}: {currency ? formatCurrency(e.value, sym) : e.value?.toLocaleString('es-AR')}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Reports() {
  const { products, sales, purchases, suppliers, categories, settings } = useStore()
  const sym = settings.currencySymbol
  const [period, setPeriod] = useState(30)
  const [activeTab, setActiveTab] = useState('ventas')

  const cutoff = subDays(new Date(), period)
  const periodSales = useMemo(() => sales.filter(s => { try { return parseISO(s.date) >= cutoff } catch { return false } }), [sales, period])
  const today = new Date()

  // Daily sales for chart
  const dailySalesData = useMemo(() => {
    const days = Math.min(period, 30)
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - 1 - i)
      const daySales = periodSales.filter(s => { try { return isSameDay(parseISO(s.date), date) } catch { return false } })
      const revenue = daySales.reduce((sum, s) => sum + s.total, 0)
      const cogs = daySales.reduce((sum, s) => {
        return sum + (s.items?.reduce((a, item) => {
          const p = products.find(pr => pr.id === item.productId)
          return a + (p ? p.costPrice * item.quantity : 0)
        }, 0) || 0)
      }, 0)
      return {
        date: format(date, 'dd/MM', { locale: es }),
        ingresos: revenue,
        costos: cogs,
        ganancia: revenue - cogs,
        transacciones: daySales.length,
      }
    })
  }, [periodSales, period, products])

  // Category sales
  const categorySalesData = useMemo(() => {
    const cats = {}
    periodSales.forEach(s => {
      s.items?.forEach(item => {
        const p = products.find(pr => pr.id === item.productId)
        const cat = p?.category || 'Otros'
        if (!cats[cat]) cats[cat] = { name: cat, ingresos: 0, unidades: 0 }
        cats[cat].ingresos += item.total
        cats[cat].unidades += item.quantity
      })
    })
    return Object.values(cats).sort((a, b) => b.ingresos - a.ingresos)
  }, [periodSales, products])

  // Product sales ranking
  const productRanking = useMemo(() => {
    const prods = {}
    periodSales.forEach(s => {
      s.items?.forEach(item => {
        if (!prods[item.productId]) prods[item.productId] = { name: item.name, ingresos: 0, unidades: 0, transacciones: 0 }
        prods[item.productId].ingresos += item.total
        prods[item.productId].unidades += item.quantity
        prods[item.productId].transacciones++
      })
    })
    return Object.values(prods).sort((a, b) => b.ingresos - a.ingresos).slice(0, 10)
  }, [periodSales])

  // Margin analysis
  const marginData = useMemo(() => {
    return products.map(p => ({
      name: p.name.substring(0, 20),
      margen: parseFloat(calcMargin(p.costPrice, p.salePrice)),
      precioVenta: p.salePrice,
      stock: p.stock,
    })).sort((a, b) => b.margen - a.margen).slice(0, 15)
  }, [products])

  // ABC analysis
  const abcData = useMemo(() => {
    const totalRevenue = periodSales.reduce((s, v) => s + v.total, 0)
    let cumulative = 0
    return productRanking.map((p, i) => {
      cumulative += p.ingresos
      const pct = totalRevenue ? (cumulative / totalRevenue) * 100 : 0
      return { ...p, abc: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C' }
    })
  }, [productRanking, periodSales])

  // Payment methods in period
  const paymentData = useMemo(() => {
    const pays = {}
    periodSales.forEach(s => {
      pays[s.payment] = (pays[s.payment] || 0) + s.total
    })
    return Object.entries(pays).map(([name, value]) => ({ name, value }))
  }, [periodSales])

  // KPIs
  const totalRevenue = periodSales.reduce((s, v) => s + v.total, 0)
  const totalCogs = periodSales.reduce((sum, s) => sum + (s.items?.reduce((a, item) => {
    const p = products.find(pr => pr.id === item.productId)
    return a + (p ? p.costPrice * item.quantity : 0)
  }, 0) || 0), 0)
  const grossProfit = totalRevenue - totalCogs
  const avgTicket = periodSales.length ? totalRevenue / periodSales.length : 0
  const totalUnits = periodSales.reduce((sum, s) => sum + (s.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0)

  const tabs = [
    { id: 'ventas', label: 'Ventas' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'productos', label: 'Productos' },
    { id: 'margenes', label: 'Márgenes' },
    { id: 'abc', label: 'Análisis ABC' },
  ]

  const handleExport = () => {
    const data = periodSales.map(s => ({
      Fecha: s.date,
      Total: s.total,
      Pago: s.payment,
      Items: s.items?.length || 0,
    }))
    exportToCSV(data, `reporte-ventas-${period}d`)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Ingresos', value: formatCurrency(totalRevenue, sym), icon: DollarSign, color: 'text-indigo-700' },
          { label: 'Ganancia bruta', value: formatCurrency(grossProfit, sym), icon: TrendingUp, color: 'text-green-700' },
          { label: 'Margen bruto', value: `${totalRevenue ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%`, icon: BarChart2, color: 'text-purple-700' },
          { label: 'Ticket promedio', value: formatCurrency(avgTicket, sym), icon: RotateCw, color: 'text-yellow-700' },
          { label: 'Unidades vendidas', value: totalUnits.toLocaleString('es-AR'), icon: Package, color: 'text-blue-700' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <kpi.icon size={16} className={`${kpi.color} mb-2`} />
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Period selector + export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[7, 14, 30, 60].map(d => (
            <button key={d} onClick={() => setPeriod(d)} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${period === d ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {d}d
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
          <Download size={14} /> Exportar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'ventas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Ingresos y ganancia diaria</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip currency sym={sym} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#6366f1" fill="url(#gIngresos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ganancia" name="Ganancia" stroke="#10b981" fill="url(#gGanancia)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Transacciones por día</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Bar dataKey="transacciones" name="Transacciones" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Medios de pago (ingresos)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} innerRadius={50} dataKey="value" paddingAngle={3}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [formatCurrency(v, sym), 'Monto']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {paymentData.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(p.value, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categorias' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Ingresos por categoría</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categorySalesData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip currency sym={sym} />} />
                <Bar dataKey="ingresos" name="Ingresos" radius={[0, 4, 4, 0]}>
                  {categorySalesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {categorySalesData.map((cat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(cat.ingresos, sym)}</p>
                <p className="text-xs text-gray-500 mt-1">{cat.unidades} unidades · {((cat.ingresos / (categorySalesData.reduce((s, c) => s + c.ingresos, 0) || 1)) * 100).toFixed(1)}% del total</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'productos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Ranking de productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Producto</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ingresos</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Unidades</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Transac.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productRanking.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                          {i + 1}
                        </div>
                        <span className="text-gray-900 font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(p.ingresos, sym)}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{p.unidades}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{p.transacciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'margenes' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Margen por producto (top 15)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={marginData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip formatter={(v) => [`${v}%`, 'Margen']} />
                <Bar dataKey="margen" name="Margen %" radius={[0, 4, 4, 0]}>
                  {marginData.map((entry, i) => (
                    <Cell key={i} fill={entry.margen >= 30 ? '#10b981' : entry.margen >= 15 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm" /> Excelente ≥30%</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-sm" /> Normal 15-30%</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm" /> Bajo &lt;15%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'abc' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {['A', 'B', 'C'].map((abc, i) => {
              const items = abcData.filter(p => p.abc === abc)
              const total = items.reduce((s, p) => s + p.ingresos, 0)
              const colors = ['bg-green-100 text-green-700 border-green-200', 'bg-yellow-100 text-yellow-700 border-yellow-200', 'bg-gray-100 text-gray-700 border-gray-200']
              const desc = abc === 'A' ? '80% del ingreso' : abc === 'B' ? '15% del ingreso' : '5% del ingreso'
              return (
                <div key={abc} className={`rounded-2xl border p-4 ${colors[i]}`}>
                  <div className="text-3xl font-black mb-1">Clase {abc}</div>
                  <p className="text-sm font-medium">{desc}</p>
                  <p className="text-lg font-bold mt-2">{items.length} productos</p>
                  <p className="text-sm">{formatCurrency(total, sym)}</p>
                </div>
              )
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Clasificación ABC de productos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Clase</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Producto</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ingresos</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Unidades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {abcData.map((p, i) => {
                    const abcColors = { A: 'bg-green-100 text-green-700', B: 'bg-yellow-100 text-yellow-700', C: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-3 px-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${abcColors[p.abc]}`}>{p.abc}</span></td>
                        <td className="py-3 px-3 text-gray-900">{p.name}</td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrency(p.ingresos, sym)}</td>
                        <td className="py-3 px-3 text-right text-gray-600">{p.unidades}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
