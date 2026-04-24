import React, { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import Modal from '../components/common/Modal'
import { formatCurrency, formatDate, PURCHASE_STATUSES, exportToCSV } from '../utils/helpers'
import { Plus, Truck, Package, X, Trash2, Edit2, CheckCircle, Clock, AlertCircle, Download, Search } from 'lucide-react'

const EMPTY_PURCHASE = {
  supplier: '', status: 'pendiente', date: new Date().toISOString().split('T')[0],
  expectedDate: '', notes: '', items: [],
}

const StatusBadge = ({ status }) => {
  const s = PURCHASE_STATUSES.find(x => x.value === status) || { label: status, color: 'gray' }
  const colors = {
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  }
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[s.color]}`}>{s.label}</span>
}

export default function Purchases() {
  const { purchases, suppliers, products, addPurchase, updatePurchaseStatus, deletePurchase, settings } = useStore()
  const sym = settings.currencySymbol

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_PURCHASE)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = !search || p.supplierName?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = !filterStatus || p.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [purchases, search, filterStatus])

  const productSearchResults = useMemo(() => {
    if (!productSearch) return []
    return products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 6)
  }, [products, productSearch])

  const addItem = (product) => {
    const existing = form.items.find(i => i.productId === product.id)
    if (existing) {
      setForm(f => ({ ...f, items: f.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.cost } : i) }))
    } else {
      setForm(f => ({ ...f, items: [...f.items, { productId: product.id, name: product.name, quantity: 1, cost: product.costPrice, total: product.costPrice }] }))
    }
    setProductSearch('')
  }

  const updateItem = (productId, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map(i => {
        if (i.productId !== productId) return i
        const updated = { ...i, [field]: parseFloat(value) || 0 }
        updated.total = updated.quantity * updated.cost
        return updated
      })
    }))
  }

  const removeItem = (productId) => {
    setForm(f => ({ ...f, items: f.items.filter(i => i.productId !== productId) }))
  }

  const handleSave = () => {
    if (!form.supplier || form.items.length === 0) return
    const supplier = suppliers.find(s => s.id === form.supplier)
    addPurchase({
      ...form,
      supplierName: supplier?.name || '',
      total: form.items.reduce((s, i) => s + i.total, 0),
    })
    setShowModal(false)
    setForm(EMPTY_PURCHASE)
  }

  const totalPending = purchases.filter(p => p.status === 'pendiente' || p.status === 'parcial').reduce((s, p) => s + p.total, 0)
  const totalMonth = purchases.filter(p => p.status === 'recibido').reduce((s, p) => s + p.total, 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total compras', value: formatCurrency(purchases.reduce((s, p) => s + p.total, 0), sym), color: 'indigo' },
          { label: 'Pendiente de recibir', value: formatCurrency(totalPending, sym), color: 'yellow' },
          { label: 'Proveedores', value: suppliers.length, color: 'green' },
          { label: 'Órdenes este mes', value: purchases.filter(p => p.status === 'recibido').length, color: 'blue' },
        ].map((stat, i) => {
          const colors = { indigo: 'bg-indigo-50 text-indigo-700', yellow: 'bg-yellow-50 text-yellow-700', green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-700' }
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${colors[stat.color].split(' ')[1]}`}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..." className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 bg-white">
            <option value="">Todos</option>
            {PURCHASE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY_PURCHASE); setShowModal(true) }} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">
          <Plus size={15} /> Nueva orden
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Truck size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500">No hay órdenes de compra</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{p.supplierName}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.date)} · {p.items?.length || 0} artículos</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900">{formatCurrency(p.total, sym)}</p>
                {p.expectedDate && <p className="text-xs text-gray-400">Esperado: {formatDate(p.expectedDate)}</p>}
              </div>
            </div>

            {expandedId === p.id && (
              <div className="border-t border-gray-100 p-4">
                <div className="space-y-2 mb-4">
                  {p.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2.5">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="text-gray-500">{item.quantity} x {formatCurrency(item.cost, sym)}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(item.total, sym)}</span>
                    </div>
                  ))}
                </div>
                {p.notes && <p className="text-xs text-gray-500 mb-3">Nota: {p.notes}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  {p.status !== 'recibido' && p.status !== 'cancelado' && (
                    <button onClick={() => updatePurchaseStatus(p.id, 'recibido')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
                      <CheckCircle size={13} /> Marcar recibido
                    </button>
                  )}
                  {p.status === 'pendiente' && (
                    <button onClick={() => updatePurchaseStatus(p.id, 'parcial')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                      <Clock size={13} /> Parcial
                    </button>
                  )}
                  {p.status !== 'recibido' && (
                    <button onClick={() => updatePurchaseStatus(p.id, 'cancelado')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors">
                      <X size={13} /> Cancelar
                    </button>
                  )}
                  <button onClick={() => deletePurchase(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 font-medium transition-colors ml-auto">
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva orden de compra"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!form.supplier || form.items.length === 0} className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 transition-colors">Crear orden</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
              <select value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white">
                <option value="">Seleccionar proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white">
                {PURCHASE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de orden</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha esperada</label>
              <input type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
          </div>

          {/* Product search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agregar productos</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar producto para agregar..."
                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              />
              {productSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                  {productSearchResults.map(p => (
                    <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm">
                      <Package size={14} className="text-gray-400" />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-gray-400">{formatCurrency(p.costPrice, sym)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items list */}
          {form.items.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-2">
                <span className="col-span-5">Producto</span>
                <span className="col-span-2 text-center">Cant.</span>
                <span className="col-span-3 text-center">Costo</span>
                <span className="col-span-2 text-right">Total</span>
              </div>
              {form.items.map(item => (
                <div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-2">
                  <span className="col-span-5 text-sm font-medium text-gray-700 truncate">{item.name}</span>
                  <input type="number" value={item.quantity} onChange={e => updateItem(item.productId, 'quantity', e.target.value)} className="col-span-2 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center outline-none focus:border-indigo-400" min="1" />
                  <input type="number" value={item.cost} onChange={e => updateItem(item.productId, 'cost', e.target.value)} className="col-span-3 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center outline-none focus:border-indigo-400" min="0" />
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.total, sym)}</span>
                    <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <span className="text-sm font-bold text-gray-900">Total: {formatCurrency(form.items.reduce((s, i) => s + i.total, 0), sym)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" rows={2} placeholder="Condiciones de pago, instrucciones de entrega..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
