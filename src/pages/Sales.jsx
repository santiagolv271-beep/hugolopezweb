import React, { useState, useMemo, useRef } from 'react'
import useStore from '../store/useStore'
import BarcodeScanner from '../components/BarcodeScanner'
import { formatCurrency, formatDateTime, PAYMENT_METHODS } from '../utils/helpers'
import {
  ShoppingCart, Plus, Minus, X, ScanLine, Search,
  Printer, CheckCircle, Package, Clock, Trash2, Tag,
  ReceiptText, CreditCard
} from 'lucide-react'

export default function Sales() {
  const { products, sales, addSale, settings } = useStore()
  const sym = settings.currencySymbol

  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [discount, setDiscount] = useState(0)
  const [cash, setCash] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [saleComplete, setSaleComplete] = useState(null)
  const [tab, setTab] = useState('pos') // 'pos' | 'history'
  const searchRef = useRef(null)

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      const matchCat = !selectedCategory || p.category === selectedCategory
      return matchSearch && matchCat && p.stock > 0
    })
  }, [products, search, selectedCategory])

  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0)
  const discountAmount = (cartTotal * discount) / 100
  const finalTotal = cartTotal - discountAmount

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
          : i
        )
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.salePrice,
        quantity: 1,
        subtotal: product.salePrice,
        maxStock: product.stock,
      }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.productId === productId
        ? { ...i, quantity: Math.min(i.maxStock, Math.max(1, i.quantity + delta)), subtotal: Math.min(i.maxStock, Math.max(1, i.quantity + delta)) * i.price }
        : i
      )
      .filter(i => i.quantity > 0)
    )
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const handleScan = (code) => {
    const product = products.find(p => p.barcode === code || p.sku === code)
    if (product && product.stock > 0) {
      addToCart(product)
    } else {
      setSearch(code)
    }
    setShowScanner(false)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    const sale = addSale({
      items: cart.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, price: i.price, total: i.subtotal })),
      total: finalTotal,
      payment,
      discount: discountAmount,
    })
    setSaleComplete({ ...sale, total: finalTotal, change: payment === 'efectivo' && cash ? parseFloat(cash) - finalTotal : 0 })
    setCart([])
    setDiscount(0)
    setCash('')
  }

  const printReceipt = (sale) => {
    const win = window.open('', '_blank', 'width=300,height=600')
    win.document.write(`
      <html><head><title>Comprobante</title>
      <style>body{font-family:monospace;width:280px;margin:0 auto;padding:10px;font-size:12px}
      h2{text-align:center;margin:0}.line{border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}.total{font-weight:bold;font-size:14px}</style>
      </head><body>
      <h2>${settings.businessName}</h2>
      <p style="text-align:center">${new Date().toLocaleString('es-AR')}</p>
      <div class="line"></div>
      ${sale.items?.map(i => `<div class="row"><span>${i.name}</span><span>${sym}${i.total?.toLocaleString('es-AR')}</span></div><div style="color:#666;font-size:11px">${i.quantity} x ${sym}${i.price?.toLocaleString('es-AR')}</div>`).join('') || ''}
      <div class="line"></div>
      ${discountAmount > 0 ? `<div class="row"><span>Descuento (${discount}%)</span><span>-${sym}${discountAmount.toLocaleString('es-AR')}</span></div>` : ''}
      <div class="row total"><span>TOTAL</span><span>${sym}${sale.total?.toLocaleString('es-AR')}</span></div>
      <div class="row"><span>Pago: ${payment}</span></div>
      ${sale.change > 0 ? `<div class="row"><span>Cambio</span><span>${sym}${sale.change.toFixed(0)}</span></div>` : ''}
      <div class="line"></div>
      <p style="text-align:center">¡Gracias por su compra!</p>
      </body></html>
    `)
    win.print()
    win.close()
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('pos')} className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'pos' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
          Punto de Venta
        </button>
        <button onClick={() => setTab('history')} className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'history' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
          Historial de ventas
        </button>
      </div>

      {tab === 'pos' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Product selection */}
          <div className="xl:col-span-2 space-y-4">
            {/* Search */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar producto o escanear código..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                  />
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 flex items-center gap-1.5 text-sm transition-colors"
                >
                  <ScanLine size={15} /> Escanear
                </button>
              </div>
              {/* Category filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${!selectedCategory ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Todos
                </button>
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c === selectedCategory ? '' : c)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${selectedCategory === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.slice(0, 24).map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group active:scale-95 animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 25, 400)}ms` }}
                >
                  <div className="w-full aspect-square bg-indigo-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-indigo-100 group-hover:scale-105 transition-all duration-200">
                    <Package size={24} className="text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{p.name}</p>
                  <p className="text-sm font-bold text-indigo-700 mt-1">{formatCurrency(p.salePrice, sym)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Stock: {p.stock}</p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-4 text-center py-12 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin productos disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-fit sticky top-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-600" />
                <span className="font-semibold text-gray-900">Carrito</span>
                {cart.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 size={12} /> Vaciar
                </button>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto max-h-[340px] p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">Agregá productos al carrito</p>
                </div>
              ) : cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl animate-slide-up hover:bg-gray-100/80 transition-colors duration-150">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price, sym)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-600 transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 text-gray-500 hover:text-green-600 transition-colors">
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(item.subtotal, sym)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                {/* Discount */}
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600 flex-1">Descuento</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={discount}
                      onChange={e => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center outline-none focus:border-indigo-400"
                      min="0" max="100"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1 bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotal, sym)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento ({discount}%)</span>
                      <span>-{formatCurrency(discountAmount, sym)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(finalTotal, sym)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Medio de pago</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_METHODS.map(pm => (
                      <button
                        key={pm.value}
                        onClick={() => setPayment(pm.value)}
                        className={`px-2 py-1.5 text-[10px] font-medium rounded-lg border transition-all ${payment === pm.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                      >
                        {pm.icon} {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash input */}
                {payment === 'efectivo' && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Efectivo recibido</label>
                    <input
                      type="number"
                      value={cash}
                      onChange={e => setCash(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400"
                      placeholder={`Ingresá el monto...`}
                    />
                    {cash && parseFloat(cash) >= finalTotal && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        Cambio: {formatCurrency(parseFloat(cash) - finalTotal, sym)}
                      </p>
                    )}
                  </div>
                )}

                {/* Checkout button */}
                <button
                  onClick={handleCheckout}
                  disabled={payment === 'efectivo' && cash && parseFloat(cash) < finalTotal}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={16} />
                  Confirmar venta · {formatCurrency(finalTotal, sym)}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="space-y-3">
          {sales.slice(0, 50).map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <ReceiptText size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{formatCurrency(s.total, sym)}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(s.date)} · {s.payment}</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Completada</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                {s.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} x{item.quantity}</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(item.total, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sale complete modal */}
      {saleComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">¡Venta completada!</h3>
            <p className="text-3xl font-bold text-indigo-700 my-3">{formatCurrency(saleComplete.total, sym)}</p>
            <p className="text-sm text-gray-500 mb-1">Método: <strong>{saleComplete.payment}</strong></p>
            {saleComplete.change > 0 && (
              <div className="my-3 bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-sm text-gray-600">Cambio a devolver</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(saleComplete.change, sym)}</p>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => printReceipt(saleComplete)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                <Printer size={15} /> Imprimir
              </button>
              <button onClick={() => setSaleComplete(null)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onDetected={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
