import { format, formatDistance, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatCurrency = (amount, symbol = '$') => {
  if (isNaN(amount) || amount === null || amount === undefined) return `${symbol}0`
  return `${symbol}${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, 'dd/MM/yyyy', { locale: es })
  } catch {
    return dateStr
  }
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, 'dd/MM/yyyy HH:mm', { locale: es })
  } catch {
    return dateStr
  }
}

export const timeAgo = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return formatDistance(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, new Date(), { addSuffix: true, locale: es })
  } catch {
    return dateStr
  }
}

export const calcMargin = (cost, sale) => {
  if (!cost || !sale || cost === 0) return 0
  return (((sale - cost) / sale) * 100).toFixed(1)
}

export const calcMarkup = (cost, sale) => {
  if (!cost || cost === 0) return 0
  return (((sale - cost) / cost) * 100).toFixed(1)
}

export const getStockStatus = (product) => {
  if (product.stock === 0) return { label: 'Sin stock', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
  if (product.stock <= product.minStock) return { label: 'Stock bajo', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' }
  if (product.maxStock && product.stock >= product.maxStock) return { label: 'Stock máx.', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' }
  return { label: 'Normal', color: 'green', bg: 'bg-green-100', text: 'text-green-700' }
}

export const getExpirationStatus = (dateStr) => {
  if (!dateStr) return null
  const expDate = new Date(dateStr)
  const now = new Date()
  const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'Vencido', color: 'red', daysLeft }
  if (daysLeft <= 7) return { label: `Vence en ${daysLeft}d`, color: 'red', daysLeft }
  if (daysLeft <= 30) return { label: `Vence en ${daysLeft}d`, color: 'yellow', daysLeft }
  return { label: `OK (${daysLeft}d)`, color: 'green', daysLeft }
}

export const generateSKU = (category, name) => {
  const catCode = (category || 'GEN').substring(0, 3).toUpperCase().replace(/\s/g, '')
  const nameCode = (name || 'PROD').replace(/\s/g, '').substring(0, 3).toUpperCase()
  const num = Math.floor(Math.random() * 900) + 100
  return `${catCode}-${nameCode}-${num}`
}

export const exportToCSV = (data, filename) => {
  if (!data || !data.length) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n')
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.click()
}

export const groupBy = (arr, key) => {
  return arr.reduce((groups, item) => {
    const val = item[key]
    groups[val] = groups[val] || []
    groups[val].push(item)
    return groups
  }, {})
}

export const sumBy = (arr, key) => arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'tarjeta débito', label: 'Tarjeta Débito', icon: '💳' },
  { value: 'tarjeta crédito', label: 'Tarjeta Crédito', icon: '💳' },
  { value: 'transferencia', label: 'Transferencia', icon: '📱' },
  { value: 'mercadopago', label: 'MercadoPago', icon: '📲' },
]

export const PURCHASE_STATUSES = [
  { value: 'pendiente', label: 'Pendiente', color: 'yellow' },
  { value: 'parcial', label: 'Parcial', color: 'blue' },
  { value: 'recibido', label: 'Recibido', color: 'green' },
  { value: 'cancelado', label: 'Cancelado', color: 'red' },
]
