import React, { useState, useRef, useEffect, useMemo } from 'react'
import useStore from '../store/useStore'
import { formatCurrency, calcMargin } from '../utils/helpers'
import { Bot, Send, User, Trash2, Sparkles, TrendingUp, Package, AlertTriangle, BarChart2, Lightbulb, Loader2 } from 'lucide-react'
import { subDays, parseISO } from 'date-fns'

// ── AI Engine: analiza los datos del negocio ──────────────────────────────
function generateAIResponse(message, storeData) {
  const { products, sales, purchases, suppliers, settings } = storeData
  const sym = settings.currencySymbol
  const msg = message.toLowerCase()

  const getLowStock = () => products.filter(p => p.stock > 0 && p.stock <= p.minStock)
  const getOutOfStock = () => products.filter(p => p.stock === 0)
  const getExpiring = () => products.filter(p => {
    if (!p.expirationDate) return false
    const d = new Date(p.expirationDate)
    const limit = new Date(); limit.setDate(limit.getDate() + 30)
    return d <= limit
  })

  const getRecentSales = (days = 30) => {
    const cutoff = subDays(new Date(), days)
    return sales.filter(s => { try { return parseISO(s.date) >= cutoff } catch { return false } })
  }

  const recentSales = getRecentSales(30)
  const totalRevenue30 = recentSales.reduce((s, v) => s + v.total, 0)
  const totalRevenue7 = getRecentSales(7).reduce((s, v) => s + v.total, 0)

  // Product sales frequency
  const salesFreq = {}
  recentSales.forEach(s => s.items?.forEach(item => {
    salesFreq[item.productId] = (salesFreq[item.productId] || 0) + item.quantity
  }))

  const topProducts = Object.entries(salesFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, qty]) => ({ ...products.find(p => p.id === id), qty }))
    .filter(Boolean)

  const slowMovers = products.filter(p => p.stock > 0 && !salesFreq[p.id])
  const avgMargin = products.length
    ? products.reduce((s, p) => s + parseFloat(calcMargin(p.costPrice, p.salePrice)), 0) / products.length
    : 0
  const inventoryValue = products.reduce((s, p) => s + (p.costPrice * p.stock), 0)

  // ── Responses ──
  if (msg.includes('stock bajo') || msg.includes('sin stock') || msg.includes('agotado') || msg.includes('reponer') || msg.includes('restock')) {
    const low = getLowStock()
    const out = getOutOfStock()
    if (out.length === 0 && low.length === 0) {
      return '✅ **¡Excelente!** Tu inventario está en buen estado. No tenés productos agotados ni con stock bajo en este momento.\n\nTe recomiendo revisar los niveles mínimos de stock para asegurarte que estén bien configurados según tu rotación real.'
    }
    let response = ''
    if (out.length > 0) {
      response += `🚨 **${out.length} productos agotados:**\n${out.slice(0, 5).map(p => `• **${p.name}** - Pedir mínimo ${p.minStock} ${p.unit}`).join('\n')}\n\n`
    }
    if (low.length > 0) {
      response += `⚠️ **${low.length} productos con stock bajo:**\n${low.slice(0, 5).map(p => `• **${p.name}** - Stock: ${p.stock}/${p.minStock} mínimo`).join('\n')}\n\n`
    }
    response += `💡 **Sugerencia:** Ordená los productos agotados primero ya que representan ventas perdidas. Usá la sección de Compras para crear las órdenes.`
    return response
  }

  if (msg.includes('venta') || msg.includes('ingreso') || msg.includes('facturación') || msg.includes('cuánto vendí') || msg.includes('cuanto vendi')) {
    const avg7 = totalRevenue7 / 7
    const avg30 = totalRevenue30 / 30
    return `📊 **Resumen de ventas:**\n\n` +
      `• **Últimos 7 días:** ${formatCurrency(totalRevenue7, sym)}\n` +
      `• **Últimos 30 días:** ${formatCurrency(totalRevenue30, sym)}\n` +
      `• **Promedio diario (7d):** ${formatCurrency(avg7, sym)}\n` +
      `• **Promedio diario (30d):** ${formatCurrency(avg30, sym)}\n` +
      `• **Transacciones:** ${recentSales.length} en 30 días\n` +
      `• **Ticket promedio:** ${recentSales.length ? formatCurrency(totalRevenue30 / recentSales.length, sym) : formatCurrency(0, sym)}\n\n` +
      `${avg7 > avg30 ? '📈 Esta semana estás **por encima** del promedio mensual. ¡Muy bien!' : '📉 Esta semana estás **por debajo** del promedio mensual. Considerá hacer una promoción.'}`
  }

  if (msg.includes('producto más vendido') || msg.includes('top') || msg.includes('más vendido') || msg.includes('bestseller') || msg.includes('mayor venta')) {
    if (topProducts.length === 0) return 'No hay datos de ventas suficientes para determinar los productos más vendidos aún.'
    return `🏆 **Top productos más vendidos (últimos 30 días):**\n\n` +
      topProducts.map((p, i) => `${i + 1}. **${p.name}** - ${p.qty} unidades vendidas`).join('\n') +
      `\n\n💡 Asegurate de mantener siempre stock de estos productos ya que son tu mayor fuente de ingresos.`
  }

  if (msg.includes('margen') || msg.includes('ganancia') || msg.includes('rentabilidad') || msg.includes('profit')) {
    const lowMarginProds = products.filter(p => parseFloat(calcMargin(p.costPrice, p.salePrice)) < 15)
    const highMarginProds = products.filter(p => parseFloat(calcMargin(p.costPrice, p.salePrice)) >= 40)
    return `💰 **Análisis de márgenes:**\n\n` +
      `• **Margen promedio:** ${avgMargin.toFixed(1)}%\n` +
      `• **Productos con margen bajo (<15%):** ${lowMarginProds.length}\n` +
      `• **Productos con margen excelente (≥40%):** ${highMarginProds.length}\n\n` +
      (lowMarginProds.length > 0 ? `⚠️ **Productos con margen bajo que revisar:**\n${lowMarginProds.slice(0, 4).map(p => `• ${p.name}: ${calcMargin(p.costPrice, p.salePrice)}%`).join('\n')}\n\n` : '') +
      `💡 Para mejorar márgenes podés: aumentar precios de venta gradualmente, negociar mejores precios con proveedores, o discontinuar productos con muy bajo margen.`
  }

  if (msg.includes('vencer') || msg.includes('vencimiento') || msg.includes('caducidad') || msg.includes('expirar')) {
    const expiring = getExpiring()
    if (expiring.length === 0) return '✅ **¡Bien!** No hay productos próximos a vencer en los próximos 30 días.'
    return `⏰ **${expiring.length} productos próximos a vencer:**\n\n` +
      expiring.map(p => {
        const d = new Date(p.expirationDate)
        const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
        return `• **${p.name}** - Vence en ${days} días (${p.expirationDate}), Stock: ${p.stock}`
      }).join('\n') +
      `\n\n💡 **Acciones recomendadas:**\n• Colocá estos productos al frente del exhibidor\n• Hacé una promoción o descuento especial\n• Notificá a tus clientes habituales`
  }

  if (msg.includes('sin movimiento') || msg.includes('no se vende') || msg.includes('lento') || msg.includes('muerto')) {
    if (slowMovers.length === 0) return '✅ Todos tus productos tuvieron algún movimiento en el último mes. ¡Buen trabajo!'
    return `📦 **${slowMovers.length} productos sin movimiento en los últimos 30 días:**\n\n` +
      slowMovers.slice(0, 6).map(p => `• **${p.name}** - Stock: ${p.stock} ${p.unit} · Valor inmovilizado: ${formatCurrency(p.costPrice * p.stock, sym)}`).join('\n') +
      `\n\nCapital inmovilizado total: **${formatCurrency(slowMovers.reduce((s, p) => s + p.costPrice * p.stock, 0), sym)}**\n\n` +
      `💡 Considerá hacer promociones o liquidar estos productos para recuperar capital.`
  }

  if (msg.includes('inventario') || msg.includes('valor') || msg.includes('capital')) {
    return `📦 **Estado del inventario:**\n\n` +
      `• **Productos totales:** ${products.length}\n` +
      `• **Valor al costo:** ${formatCurrency(inventoryValue, sym)}\n` +
      `• **Valor a precio de venta:** ${formatCurrency(products.reduce((s, p) => s + p.salePrice * p.stock, 0), sym)}\n` +
      `• **Ganancia potencial:** ${formatCurrency(products.reduce((s, p) => s + (p.salePrice - p.costPrice) * p.stock, 0), sym)}\n` +
      `• **Categorías:** ${[...new Set(products.map(p => p.category))].length}\n` +
      `• **Sin stock:** ${getOutOfStock().length} productos\n` +
      `• **Stock bajo:** ${getLowStock().length} productos`
  }

  if (msg.includes('proveedor') || msg.includes('proveedor') || msg.includes('compra')) {
    return `🚚 **Resumen de proveedores:**\n\n` +
      `• **Proveedores activos:** ${suppliers.length}\n` +
      `• **Órdenes de compra:** ${purchases.length}\n` +
      `• **Compras pendientes:** ${purchases.filter(p => p.status === 'pendiente').length}\n\n` +
      `**Por proveedor:**\n` +
      suppliers.slice(0, 4).map(s => {
        const sp = purchases.filter(p => p.supplier === s.id)
        const total = sp.reduce((sum, p) => sum + p.total, 0)
        return `• **${s.name}:** ${sp.length} órdenes · ${formatCurrency(total, sym)}`
      }).join('\n')
  }

  if (msg.includes('hola') || msg.includes('buenas') || msg.includes('qué podés') || msg.includes('ayuda') || msg.includes('help') || msg.includes('que podes')) {
    return `¡Hola! 👋 Soy tu asistente de IA para gestión de inventario. Tengo acceso a todos tus datos en tiempo real y puedo ayudarte con:\n\n` +
      `📊 **Análisis de ventas** - "¿Cuánto vendí este mes?"\n` +
      `📦 **Control de stock** - "¿Qué productos necesito reponer?"\n` +
      `💰 **Análisis de márgenes** - "¿Cuál es mi rentabilidad?"\n` +
      `⏰ **Vencimientos** - "¿Qué productos están por vencer?"\n` +
      `🏆 **Productos estrella** - "¿Cuáles son mis más vendidos?"\n` +
      `📉 **Stock muerto** - "¿Qué no se está vendiendo?"\n` +
      `🚚 **Proveedores** - "¿Cómo están mis compras?"\n\n` +
      `¿Sobre qué querés saber más?`
  }

  if (msg.includes('suger') || msg.includes('consejo') || msg.includes('recomend') || msg.includes('qué hago') || msg.includes('que hago')) {
    const out = getOutOfStock()
    const low = getLowStock()
    const expiring = getExpiring()
    const suggestions = []
    if (out.length > 0) suggestions.push(`🚨 **Urgente:** Reponés ${out.length} productos agotados que representan ventas perdidas`)
    if (low.length > 0) suggestions.push(`⚠️ **Esta semana:** Ordenás ${low.length} productos con stock bajo`)
    if (expiring.length > 0) suggestions.push(`⏰ **Próximo:** Hacés una promo para ${expiring.length} productos por vencer`)
    if (slowMovers.length > 0) suggestions.push(`📉 **Mediano plazo:** Liquidás ${slowMovers.length} productos sin movimiento`)
    if (avgMargin < 20) suggestions.push(`💰 **Revisar precios:** Tu margen promedio del ${avgMargin.toFixed(1)}% está por debajo del 20% recomendado`)

    if (suggestions.length === 0) return '✅ ¡Tu negocio está en excelente estado! Todo funciona correctamente.\n\nTe sugiero revisar los reportes de análisis ABC para optimizar tu mix de productos.'
    return `💡 **Mis sugerencias prioritarias para hoy:**\n\n${suggestions.join('\n\n')}\n\n¿Querés que profundice en alguno de estos puntos?`
  }

  if (msg.includes('precio') || msg.includes('subir precio') || msg.includes('aumentar precio')) {
    const lowMargin = products.filter(p => parseFloat(calcMargin(p.costPrice, p.salePrice)) < 20)
    return `💲 **Análisis de precios:**\n\n` +
      `• Margen promedio actual: **${avgMargin.toFixed(1)}%**\n` +
      `• Productos con margen menor al 20%: **${lowMargin.length}**\n\n` +
      (lowMargin.length > 0
        ? `**Productos a revisar precios:**\n${lowMargin.slice(0, 5).map(p => `• ${p.name}: costo ${formatCurrency(p.costPrice, sym)} → venta actual ${formatCurrency(p.salePrice, sym)} (${calcMargin(p.costPrice, p.salePrice)}%)`).join('\n')}\n\n`
        : '') +
      `💡 Para un margen saludable, apuntá a un mínimo del 25-30% en la mayoría de tus productos.`
  }

  // Default response with context-aware insight
  const insight = (() => {
    const out = getOutOfStock()
    if (out.length > 3) return `Noto que tenés ${out.length} productos agotados. ¿Querés que te ayude con el plan de reposición?`
    if (totalRevenue7 < totalRevenue30 / 4) return `Las ventas de esta semana están por debajo del promedio. ¿Querés analizar qué está pasando?`
    if (slowMovers.length > 5) return `Tenés ${slowMovers.length} productos sin ventas en el último mes. ¿Querés ver estrategias para activarlos?`
    return `Tu negocio tiene ${products.length} productos con un valor de inventario de ${formatCurrency(inventoryValue, sym)}. ¿Sobre qué aspecto de tu negocio querés profundizar?`
  })()

  return `No entendí exactamente tu pregunta, pero puedo ayudarte. ${insight}\n\nAlgunos temas que manejo:\n• Ventas y facturación\n• Stock y reposición\n• Márgenes y rentabilidad\n• Productos más vendidos\n• Vencimientos\n• Proveedores y compras`
}

const QUICK_PROMPTS = [
  { icon: Package, text: '¿Qué necesito reponer?', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
  { icon: TrendingUp, text: '¿Cuánto vendí este mes?', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
  { icon: BarChart2, text: '¿Cuáles son mis más vendidos?', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
  { icon: AlertTriangle, text: '¿Qué está por vencer?', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
  { icon: Lightbulb, text: 'Dame sugerencias de mejora', color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' },
  { icon: BarChart2, text: '¿Cómo están mis márgenes?', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const lines = msg.content.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>
    // Handle bold inline
    const parts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <p key={i} className={line === '' ? 'mt-1' : ''}>
        {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
      </p>
    )
  })
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'}`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
        {lines}
        <p className={`text-xs mt-2 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(msg.time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { aiMessages, addAIMessage, clearAIMessages, products, sales, purchases, suppliers, settings } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, loading])

  const storeData = useMemo(() => ({ products, sales, purchases, suppliers, settings }), [products, sales, purchases, suppliers, settings])

  const handleSend = async (text) => {
    const message = (text || input).trim()
    if (!message || loading) return

    addAIMessage({ role: 'user', content: message, time: new Date().toISOString() })
    setInput('')
    setLoading(true)

    // Simulate AI thinking time
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800))

    const response = generateAIResponse(message, storeData)
    addAIMessage({ role: 'assistant', content: response, time: new Date().toISOString() })
    setLoading(false)
    inputRef.current?.focus()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 h-[calc(100vh-160px)] min-h-[500px]">
      {/* Chat */}
      <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Asistente IA</p>
              <p className="text-xs text-indigo-200">Análisis de inventario en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/80">Online</span>
            </div>
            <button onClick={clearAIMessages} className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Limpiar chat">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
          {aiMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500">Analizando tus datos...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Preguntame sobre tu inventario, ventas, márgenes..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick prompts sidebar */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-indigo-600" />
            <span className="font-semibold text-gray-900 text-sm">Preguntas rápidas</span>
          </div>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p.text)}
                disabled={loading}
                className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left text-sm font-medium transition-all disabled:opacity-50 ${p.color}`}
              >
                <p.icon size={15} className="flex-shrink-0" />
                {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Data summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">DATOS EN TIEMPO REAL</p>
          <div className="space-y-2.5">
            {[
              { label: 'Productos', value: products.length },
              { label: 'Ventas registradas', value: sales.length },
              { label: 'Proveedores', value: suppliers.length },
              { label: 'Órdenes de compra', value: purchases.length },
            ].map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4 text-sm text-indigo-700">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} />
            <span className="font-semibold">IA local</span>
          </div>
          <p className="text-xs text-indigo-600 leading-relaxed">
            Este asistente analiza tus datos en tiempo real sin enviar información a servidores externos. Tus datos son 100% privados.
          </p>
        </div>
      </div>
    </div>
  )
}
