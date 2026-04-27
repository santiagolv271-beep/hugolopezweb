import React, { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import Modal from '../components/common/Modal'
import BarcodeScanner from '../components/BarcodeScanner'
import {
  Plus, Search, ScanLine, Edit2, Trash2, Package,
  Filter, Download, Upload, ChevronUp, ChevronDown,
  AlertTriangle, X, BarChart2, ArrowUpDown
} from 'lucide-react'
import { formatCurrency, formatDate, getStockStatus, getExpirationStatus, calcMargin, generateSKU, exportToCSV } from '../utils/helpers'

const EMPTY_PRODUCT = {
  name: '', sku: '', barcode: '', category: '',
  description: '', costPrice: '', salePrice: '',
  stock: '', minStock: 5, maxStock: '', unit: 'unidad',
  supplier: '', location: '', expirationDate: '',
}

export default function Inventory() {
  const { products, suppliers, categories, units, addProduct, updateProduct, deleteProduct, adjustStock, settings } = useStore()
  const sym = settings.currencySymbol

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [showScanner, setShowScanner] = useState(false)
  const [scanFor, setScanFor] = useState('search') // 'search' | 'form'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showAdjust, setShowAdjust] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'

  // Filter and sort
  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      const matchCat = !filterCat || p.category === filterCat
      const matchStatus = !filterStatus ||
        (filterStatus === 'low' && p.stock > 0 && p.stock <= p.minStock) ||
        (filterStatus === 'out' && p.stock === 0) ||
        (filterStatus === 'ok' && p.stock > p.minStock)
      return matchSearch && matchCat && matchStatus
    })

    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [products, search, filterCat, filterStatus, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-indigo-500" /> : <ChevronDown size={12} className="text-indigo-500" />
  }

  const openAdd = () => {
    setEditProduct(null)
    setForm(EMPTY_PRODUCT)
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ ...p })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name || !form.category) return
    const data = {
      ...form,
      costPrice: parseFloat(form.costPrice) || 0,
      salePrice: parseFloat(form.salePrice) || 0,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 0,
      maxStock: parseInt(form.maxStock) || 0,
      sku: form.sku || generateSKU(form.category, form.name),
    }
    if (editProduct) {
      updateProduct(editProduct.id, data)
    } else {
      addProduct(data)
    }
    setShowModal(false)
  }

  const handleScanDetected = (code) => {
    if (scanFor === 'search') {
      setSearch(code)
      setShowScanner(false)
    } else {
      setForm(f => ({ ...f, barcode: code }))
      setShowScanner(false)
    }
  }

  const handleAdjust = () => {
    if (!adjustQty) return
    adjustStock(showAdjust.id, parseInt(adjustQty), adjustReason)
    setShowAdjust(null)
    setAdjustQty('')
    setAdjustReason('')
  }

  const handleExport = () => {
    exportToCSV(filtered.map(p => ({
      Nombre: p.name, SKU: p.sku, Código: p.barcode, Categoría: p.category,
      'Costo ($)': p.costPrice, 'Precio ($)': p.salePrice, Stock: p.stock,
      'Stock Mín.': p.minStock, Unidad: p.unit, Proveedor: p.supplier,
      Vencimiento: p.expirationDate || '-'
    })), 'inventario')
  }

  const totalValue = filtered.reduce((s, p) => s + (p.costPrice * p.stock), 0)
  const totalSaleValue = filtered.reduce((s, p) => s + (p.salePrice * p.stock), 0)

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{filtered.length} productos · Valor costo: <strong>{formatCurrency(totalValue, sym)}</strong> · Valor venta: <strong>{formatCurrency(totalSaleValue, sym)}</strong></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm">
            <Download size={15} /> Exportar
          </button>
          <button
            onClick={() => { setScanFor('search'); setShowScanner(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <ScanLine size={15} /> Escanear
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-150 font-medium active:scale-95 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-300">
            <Plus size={15} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o código de barras..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="out">Sin stock</option>
            <option value="low">Stock bajo</option>
            <option value="ok">Normal</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { key: 'name', label: 'Producto' },
                  { key: 'category', label: 'Categoría' },
                  { key: 'costPrice', label: 'Costo' },
                  { key: 'salePrice', label: 'Precio' },
                  { key: null, label: 'Margen' },
                  { key: 'stock', label: 'Stock' },
                  { key: null, label: 'Estado' },
                  { key: 'expirationDate', label: 'Venc.' },
                  { key: null, label: 'Acciones' },
                ].map(col => (
                  <th
                    key={col.label}
                    className={`px-4 py-3 text-left font-semibold text-gray-600 text-xs whitespace-nowrap ${col.key ? 'cursor-pointer select-none hover:text-indigo-600' : ''}`}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                        <Package size={24} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No se encontraron productos</p>
                      <p className="text-gray-400 text-sm">Probá con otros filtros o agregá un nuevo producto</p>
                      <button onClick={openAdd} className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus size={15} /> Agregar producto
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((p, rowIdx) => {
                const status = getStockStatus(p)
                const expStatus = getExpirationStatus(p.expirationDate)
                const margin = calcMargin(p.costPrice, p.salePrice)
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-indigo-50/30 transition-all duration-150 group"
                    style={{ animationDelay: `${Math.min(rowIdx * 30, 300)}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 group-hover:scale-105 transition-all duration-200">
                          <Package size={16} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate max-w-[180px]">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku} {p.barcode && `· ${p.barcode}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{formatCurrency(p.costPrice, sym)}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{formatCurrency(p.salePrice, sym)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${parseFloat(margin) >= 30 ? 'text-green-600' : parseFloat(margin) >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{p.stock}</span>
                        <span className="text-xs text-gray-400">{p.unit}</span>
                        <button
                          onClick={() => setShowAdjust(p)}
                          className="p-1 hover:bg-indigo-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Ajustar stock"
                        >
                          <ArrowUpDown size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {expStatus ? (
                        <span className={`text-xs font-medium ${expStatus.color === 'red' ? 'text-red-600' : expStatus.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {expStatus.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(p)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editProduct ? 'Editar producto' : 'Nuevo producto'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold">
              {editProduct ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              placeholder="Ej: Coca Cola 2.25L"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              placeholder="Generado automáticamente"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                placeholder="Escanear o ingresar"
              />
              <button
                type="button"
                onClick={() => { setScanFor('form'); setShowScanner(true) }}
                className="px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ScanLine size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              value={form.supplier}
              onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo ($)</label>
            <input
              type="number"
              value={form.costPrice}
              onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              placeholder="0.00"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta ($)</label>
            <div>
              <input
                type="number"
                value={form.salePrice}
                onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                placeholder="0.00"
                min="0"
              />
              {form.costPrice && form.salePrice && (
                <p className="text-xs text-indigo-600 mt-1">
                  Margen: {calcMargin(parseFloat(form.costPrice), parseFloat(form.salePrice))}%
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
            <input
              type="number"
              value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
            <input
              type="number"
              value={form.minStock}
              onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              placeholder="5"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock máximo</label>
            <input
              type="number"
              value={form.maxStock}
              onChange={e => setForm(f => ({ ...f, maxStock: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              placeholder="100"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
            <select
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white"
            >
              {useStore.getState().units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación en local</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              placeholder="Ej: Estante A3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
            <input
              type="date"
              value={form.expirationDate}
              onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none"
              rows={2}
              placeholder="Descripción opcional del producto..."
            />
          </div>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={!!showAdjust}
        onClose={() => setShowAdjust(null)}
        title="Ajustar stock"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAdjust(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={handleAdjust} className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold transition-colors">Guardar</button>
          </>
        }
      >
        {showAdjust && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-900">{showAdjust.name}</p>
              <p className="text-gray-500">Stock actual: <strong>{showAdjust.stock}</strong> {showAdjust.unit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ajuste (+ para agregar, - para quitar)</label>
              <input
                type="number"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                placeholder="Ej: +10 o -5"
                autoFocus
              />
              {adjustQty && (
                <p className="text-xs text-indigo-600 mt-1">
                  Nuevo stock: {Math.max(0, showAdjust.stock + parseInt(adjustQty || 0))} {showAdjust.unit}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                placeholder="Ej: Corrección de inventario, rotura, etc."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Eliminar producto"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={() => { deleteProduct(showDeleteConfirm.id); setShowDeleteConfirm(null) }} className="px-6 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors">Eliminar</button>
          </>
        }
      >
        {showDeleteConfirm && (
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <p className="text-gray-700">¿Estás seguro de eliminar <strong>"{showDeleteConfirm.name}"</strong>?</p>
            <p className="text-sm text-gray-400 mt-1">Esta acción no se puede deshacer.</p>
          </div>
        )}
      </Modal>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleScanDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
