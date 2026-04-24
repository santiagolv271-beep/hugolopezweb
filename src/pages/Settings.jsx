import React, { useState } from 'react'
import useStore from '../store/useStore'
import { Settings as SettingsIcon, Building2, DollarSign, Bell, Database, Palette, Shield, Plus, X, Trash2 } from 'lucide-react'

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
        <Icon size={16} className="text-indigo-600" />
      </div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
)

const Field = ({ label, sub, children }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
)

const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
)

export default function Settings() {
  const { settings, updateSettings, categories, addCategory, products, sales, suppliers, purchases } = useStore()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleSave = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleAddCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return
    addCategory(newCategory.trim())
    setNewCategory('')
  }

  const handleExportAll = () => {
    const data = {
      products,
      sales: sales.slice(0, 100),
      suppliers,
      purchases,
      settings,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stockmaster-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Business info */}
      <Section icon={Building2} title="Información del negocio">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'businessName', label: 'Nombre del negocio', placeholder: 'Mi Comercio' },
            { key: 'businessType', label: 'Tipo de negocio', placeholder: 'Almacén, Ferretería, etc.' },
            { key: 'address', label: 'Dirección', placeholder: 'Dirección completa' },
            { key: 'phone', label: 'Teléfono', placeholder: '011-1234-5678' },
            { key: 'email', label: 'Email', placeholder: 'negocio@email.com' },
          ].map(f => (
            <div key={f.key} className={f.key === 'address' ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type="text"
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Currency & taxes */}
      <Section icon={DollarSign} title="Moneda e impuestos">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white">
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="USD">USD - Dólar</option>
              <option value="CLP">CLP - Peso Chileno</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="PYG">PYG - Guaraní</option>
              <option value="UYU">UYU - Peso Uruguayo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Símbolo</label>
            <input type="text" value={form.currencySymbol || '$'} onChange={e => set('currencySymbol', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" placeholder="$" maxLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IVA / Impuesto (%)</label>
            <input type="number" value={form.taxRate} onChange={e => set('taxRate', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" min="0" max="100" />
          </div>
        </div>
      </Section>

      {/* Stock alerts */}
      <Section icon={Bell} title="Alertas de stock">
        <Field label="Stock mínimo global" sub="Valor predeterminado para nuevos productos">
          <input
            type="number"
            value={form.lowStockThreshold}
            onChange={e => set('lowStockThreshold', parseInt(e.target.value) || 0)}
            className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center outline-none focus:border-indigo-400"
            min="0"
          />
        </Field>
        <Field label="Alertas de vencimiento" sub="Mostrar alertas para productos próximos a vencer">
          <Toggle value={form.aiEnabled !== false} onChange={v => set('aiEnabled', v)} />
        </Field>
      </Section>

      {/* Categories */}
      <Section icon={Database} title="Categorías de productos">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            placeholder="Nueva categoría..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
          />
          <button onClick={handleAddCategory} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors font-medium">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full font-medium">
              {cat}
            </span>
          ))}
        </div>
      </Section>

      {/* Data management */}
      <Section icon={Database} title="Gestión de datos">
        <div className="space-y-3">
          <button onClick={handleExportAll} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full">
            <Database size={16} className="text-gray-500" />
            Exportar backup completo (JSON)
          </button>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Estadísticas del sistema</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Productos', value: products.length },
                { label: 'Ventas', value: sales.length },
                { label: 'Proveedores', value: suppliers.length },
                { label: 'Compras', value: purchases.length },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* App info */}
      <Section icon={Shield} title="Acerca de StockMaster Pro">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <SettingsIcon size={24} className="text-white" />
          </div>
          <p className="font-bold text-gray-900 text-lg">StockMaster Pro</p>
          <p className="text-sm text-gray-500">Sistema de gestión de inventario</p>
          <p className="text-xs text-gray-400 mt-1">Versión 1.0.0</p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-gray-400">
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ Inventario</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ POS</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ Compras</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ Proveedores</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ Reportes</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ IA integrada</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">✓ Escáner código de barras</span>
          </div>
        </div>
      </Section>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <button onClick={() => setForm({ ...settings })} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Descartar
        </button>
        <button
          onClick={handleSave}
          className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${saved ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
