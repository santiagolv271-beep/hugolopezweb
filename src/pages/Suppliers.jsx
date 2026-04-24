import React, { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import Modal from '../components/common/Modal'
import { Users, Plus, Edit2, Trash2, Phone, Mail, MapPin, Search, X, Package, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'

const EMPTY_SUPPLIER = {
  name: '', contact: '', email: '', phone: '', address: '', category: '', notes: ''
}

export default function Suppliers() {
  const { suppliers, products, purchases, categories, addSupplier, updateSupplier, deleteSupplier, settings } = useStore()
  const sym = settings.currencySymbol

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [form, setForm] = useState(EMPTY_SUPPLIER)
  const [selectedSupplierId, setSelectedSupplierId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const filtered = useMemo(() =>
    suppliers.filter(s => !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase())
    ), [suppliers, search])

  const openAdd = () => { setEditSupplier(null); setForm(EMPTY_SUPPLIER); setShowModal(true) }
  const openEdit = (s) => { setEditSupplier(s); setForm({ ...s }); setShowModal(true) }

  const handleSave = () => {
    if (!form.name) return
    if (editSupplier) updateSupplier(editSupplier.id, form)
    else addSupplier(form)
    setShowModal(false)
  }

  const getSupplierProducts = (supplierId) => products.filter(p => p.supplier === supplierId)
  const getSupplierPurchases = (supplierId) => purchases.filter(p => p.supplier === supplierId)
  const getSupplierTotal = (supplierId) => getSupplierPurchases(supplierId).reduce((s, p) => s + p.total, 0)

  const selected = selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId) : null

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Suppliers list */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..." className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">
            <Plus size={15} /> Nuevo proveedor
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total proveedores', value: suppliers.length, color: 'indigo' },
            { label: 'Productos registrados', value: products.filter(p => p.supplier).length, color: 'green' },
            { label: 'Total compras', value: formatCurrency(purchases.reduce((s, p) => s + p.total, 0), sym), color: 'purple' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Supplier cards */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Users size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500">No se encontraron proveedores</p>
            </div>
          ) : filtered.map(s => {
            const supplierProducts = getSupplierProducts(s.id)
            const total = getSupplierTotal(s.id)
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSupplierId(s.id === selectedSupplierId ? null : s.id)}
                className={`bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-md ${selectedSupplierId === s.id ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-gray-100'}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 font-bold text-base">{s.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                        {s.contact && <p className="text-sm text-gray-500">{s.contact}</p>}
                        {s.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.category}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(s) }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(s) }} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    {s.phone && <span className="flex items-center gap-1"><Phone size={11} />{s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1 truncate"><Mail size={11} />{s.email}</span>}
                    {s.address && <span className="flex items-center gap-1"><MapPin size={11} />{s.address}</span>}
                  </div>

                  <div className="mt-3 flex gap-4 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Package size={11} /> {supplierProducts.length} productos
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <ShoppingBag size={11} /> {formatCurrency(total, sym)} comprado
                    </span>
                  </div>
                </div>

                {/* Expanded products */}
                {selectedSupplierId === s.id && supplierProducts.length > 0 && (
                  <div className="border-t border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">PRODUCTOS</p>
                    <div className="space-y-1.5">
                      {supplierProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-700 truncate">{p.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            <span className="text-gray-500">Stock: {p.stock}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(p.salePrice, sym)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {s.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                        <p className="text-xs text-yellow-700 font-medium">📝 Notas: {s.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Contact card */}
      <div className="space-y-4">
        {selected ? (
          <div className="bg-white rounded-2xl border border-indigo-200 p-5 sticky top-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-indigo-700">{selected.name.charAt(0)}</span>
              </div>
              <h3 className="font-bold text-gray-900">{selected.name}</h3>
              {selected.contact && <p className="text-sm text-gray-500">{selected.contact}</p>}
            </div>
            <div className="space-y-3 text-sm">
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <Phone size={16} className="text-indigo-500" />
                  <span>{selected.phone}</span>
                </a>
              )}
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <Mail size={16} className="text-indigo-500" />
                  <span className="truncate">{selected.email}</span>
                </a>
              )}
              {selected.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{selected.address}</span>
                </div>
              )}
              {selected.notes && (
                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">NOTAS</p>
                  <p className="text-xs text-yellow-800">{selected.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-lg font-bold text-gray-900">{getSupplierProducts(selected.id).length}</p>
                <p className="text-xs text-gray-500">Productos</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(getSupplierTotal(selected.id), sym)}</p>
                <p className="text-xs text-gray-500">Comprado</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Users size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Seleccioná un proveedor<br/>para ver sus detalles</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editSupplier ? 'Editar proveedor' : 'Nuevo proveedor'} size="md" footer={
        <>
          <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold transition-colors">Guardar</button>
        </>
      }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { field: 'name', label: 'Nombre *', placeholder: 'Nombre de la empresa', full: true },
            { field: 'contact', label: 'Contacto', placeholder: 'Nombre del contacto' },
            { field: 'email', label: 'Email', placeholder: 'email@empresa.com' },
            { field: 'phone', label: 'Teléfono', placeholder: '011-1234-5678' },
            { field: 'address', label: 'Dirección', placeholder: 'Dirección completa', full: true },
          ].map(f => (
            <div key={f.field} className={f.full ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type="text"
                value={form[f.field]}
                onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" rows={2} placeholder="Condiciones, días de entrega, etc." />
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Eliminar proveedor" size="sm" footer={
        <>
          <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={() => { deleteSupplier(showDeleteConfirm.id); setShowDeleteConfirm(null) }} className="px-6 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors">Eliminar</button>
        </>
      }>
        {showDeleteConfirm && (
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <p className="text-gray-700">¿Eliminar a <strong>"{showDeleteConfirm.name}"</strong>?</p>
            <p className="text-sm text-gray-400 mt-1">Los productos asociados no serán eliminados.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
