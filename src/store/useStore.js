import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format, subDays, subMonths } from 'date-fns'

// ─── Sample Data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Bebidas', 'Alimentos secos', 'Lácteos', 'Carnes y fiambres',
  'Verduras y frutas', 'Limpieza', 'Higiene personal', 'Snacks y golosinas',
  'Congelados', 'Ferretería', 'Otros'
]

const UNITS = ['unidad', 'kg', 'g', 'litro', 'ml', 'docena', 'pack', 'caja', 'bolsa']

const sampleSuppliers = [
  { id: 's1', name: 'Distribuidora Norte SA', contact: 'Carlos Pérez', email: 'ventas@disnorte.com', phone: '011-4523-7890', address: 'Av. San Martín 1450, CABA', category: 'Bebidas', notes: 'Pago a 30 días. Entrega martes y jueves.', createdAt: '2024-01-15' },
  { id: 's2', name: 'Alimentos del Sur SRL', contact: 'María González', email: 'pedidos@alsur.com', phone: '011-3341-2200', address: 'Ruta 3 km 45, Lanús', category: 'Alimentos secos', notes: 'Descuento 5% por volumen mayor a $50.000.', createdAt: '2024-02-01' },
  { id: 's3', name: 'Lácteos Frescos SA', contact: 'Roberto Díaz', email: 'ventas@lf.com.ar', phone: '0341-456-7890', address: 'Parque Industrial, Rosario', category: 'Lácteos', notes: 'Entrega diaria antes de las 8am.', createdAt: '2024-01-20' },
  { id: 's4', name: 'Limpiar Bien Dist.', contact: 'Ana Martínez', email: 'ana@limpiarbien.com', phone: '011-5678-9012', address: 'Boedo 789, CABA', category: 'Limpieza', notes: 'Solo efectivo o transferencia inmediata.', createdAt: '2024-03-10' },
  { id: 's5', name: 'Snack World SA', contact: 'Diego Sosa', email: 'diego@snackworld.com', phone: '011-2233-4455', address: 'Av. Corrientes 5000, CABA', category: 'Snacks y golosinas', notes: 'Pedido mínimo $15.000.', createdAt: '2024-02-20' },
]

const sampleProducts = [
  // Bebidas
  { id: 'p1', name: 'Coca Cola 2.25L', sku: 'BEB-001', barcode: '7790895000139', category: 'Bebidas', description: 'Gaseosa cola botella plástica 2.25 litros', costPrice: 850, salePrice: 1200, stock: 48, minStock: 12, maxStock: 120, unit: 'unidad', supplier: 's1', location: 'A1', expirationDate: '2025-08-15', createdAt: '2024-01-10', updatedAt: '2024-06-01' },
  { id: 'p2', name: 'Fanta Naranja 2L', sku: 'BEB-002', barcode: '7790895000200', category: 'Bebidas', description: 'Gaseosa naranja botella 2 litros', costPrice: 780, salePrice: 1100, stock: 6, minStock: 10, maxStock: 100, unit: 'unidad', supplier: 's1', location: 'A2', expirationDate: '2025-07-20', createdAt: '2024-01-10', updatedAt: '2024-06-01' },
  { id: 'p3', name: 'Agua Villavicencio 1.5L', sku: 'BEB-003', barcode: '7790580000047', category: 'Bebidas', description: 'Agua mineral sin gas 1.5 litros', costPrice: 350, salePrice: 550, stock: 72, minStock: 24, maxStock: 200, unit: 'unidad', supplier: 's1', location: 'A3', expirationDate: '2026-01-10', createdAt: '2024-01-10', updatedAt: '2024-06-01' },
  { id: 'p4', name: 'Cerveza Quilmes 1L', sku: 'BEB-004', barcode: '7792450000213', category: 'Bebidas', description: 'Cerveza rubia retornable 1 litro', costPrice: 680, salePrice: 950, stock: 0, minStock: 12, maxStock: 60, unit: 'unidad', supplier: 's1', location: 'A4', expirationDate: '2025-09-01', createdAt: '2024-01-10', updatedAt: '2024-06-01' },
  { id: 'p5', name: 'Jugo Tang Naranja', sku: 'BEB-005', barcode: '7622300000011', category: 'Bebidas', description: 'Jugo en polvo sabor naranja 1kg', costPrice: 480, salePrice: 750, stock: 35, minStock: 10, maxStock: 80, unit: 'unidad', supplier: 's2', location: 'A5', expirationDate: '2025-12-31', createdAt: '2024-02-05', updatedAt: '2024-06-01' },
  // Alimentos secos
  { id: 'p6', name: 'Arroz Gallo Oro 1kg', sku: 'ALI-001', barcode: '7790040000012', category: 'Alimentos secos', description: 'Arroz largo fino calidad extra 1kg', costPrice: 680, salePrice: 980, stock: 55, minStock: 20, maxStock: 150, unit: 'kg', supplier: 's2', location: 'B1', expirationDate: '2026-06-30', createdAt: '2024-01-15', updatedAt: '2024-06-01' },
  { id: 'p7', name: 'Fideos Lucchetti 500g', sku: 'ALI-002', barcode: '7791050000023', category: 'Alimentos secos', description: 'Fideos secos tallarines 500g', costPrice: 420, salePrice: 620, stock: 80, minStock: 30, maxStock: 200, unit: 'unidad', supplier: 's2', location: 'B2', expirationDate: '2026-03-15', createdAt: '2024-01-15', updatedAt: '2024-06-01' },
  { id: 'p8', name: 'Aceite Natura 900ml', sku: 'ALI-003', barcode: '7790900000034', category: 'Alimentos secos', description: 'Aceite de girasol 900ml', costPrice: 1100, salePrice: 1580, stock: 4, minStock: 12, maxStock: 60, unit: 'unidad', supplier: 's2', location: 'B3', expirationDate: '2025-11-20', createdAt: '2024-01-15', updatedAt: '2024-06-01' },
  { id: 'p9', name: 'Azúcar Ledesma 1kg', sku: 'ALI-004', barcode: '7790070000045', category: 'Alimentos secos', description: 'Azúcar blanca refinada 1kg', costPrice: 580, salePrice: 850, stock: 45, minStock: 15, maxStock: 100, unit: 'kg', supplier: 's2', location: 'B4', expirationDate: '2026-12-31', createdAt: '2024-01-15', updatedAt: '2024-06-01' },
  { id: 'p10', name: 'Sal Dos Anclas 500g', sku: 'ALI-005', barcode: '7790120000056', category: 'Alimentos secos', description: 'Sal fina yodada 500g', costPrice: 180, salePrice: 290, stock: 60, minStock: 20, maxStock: 120, unit: 'unidad', supplier: 's2', location: 'B5', expirationDate: '2027-01-01', createdAt: '2024-01-15', updatedAt: '2024-06-01' },
  // Lácteos
  { id: 'p11', name: 'Leche La Serenísima 1L', sku: 'LAC-001', barcode: '7790460000067', category: 'Lácteos', description: 'Leche entera larga vida 1 litro', costPrice: 620, salePrice: 890, stock: 30, minStock: 20, maxStock: 100, unit: 'litro', supplier: 's3', location: 'C1', expirationDate: '2025-08-01', createdAt: '2024-01-20', updatedAt: '2024-06-01' },
  { id: 'p12', name: 'Yogur Ser Natural 190g', sku: 'LAC-002', barcode: '7794000000078', category: 'Lácteos', description: 'Yogur bebible natural 190g', costPrice: 280, salePrice: 420, stock: 24, minStock: 12, maxStock: 60, unit: 'unidad', supplier: 's3', location: 'C2', expirationDate: '2025-07-10', createdAt: '2024-01-20', updatedAt: '2024-06-01' },
  { id: 'p13', name: 'Queso Cremoso 300g', sku: 'LAC-003', barcode: '7793000000089', category: 'Lácteos', description: 'Queso cremoso en barra 300g aprox.', costPrice: 1800, salePrice: 2500, stock: 8, minStock: 5, maxStock: 30, unit: 'unidad', supplier: 's3', location: 'C3', expirationDate: '2025-07-20', createdAt: '2024-01-20', updatedAt: '2024-06-01' },
  { id: 'p14', name: 'Manteca La Paulina 200g', sku: 'LAC-004', barcode: '7791500000090', category: 'Lácteos', description: 'Manteca sin sal 200g', costPrice: 950, salePrice: 1350, stock: 15, minStock: 8, maxStock: 40, unit: 'unidad', supplier: 's3', location: 'C4', expirationDate: '2025-09-15', createdAt: '2024-01-20', updatedAt: '2024-06-01' },
  // Limpieza
  { id: 'p15', name: 'Detergente Magistral 750ml', sku: 'LIM-001', barcode: '7790100000101', category: 'Limpieza', description: 'Detergente lavavajillas concentrado 750ml', costPrice: 450, salePrice: 680, stock: 40, minStock: 12, maxStock: 80, unit: 'unidad', supplier: 's4', location: 'D1', expirationDate: '2027-01-01', createdAt: '2024-03-10', updatedAt: '2024-06-01' },
  { id: 'p16', name: 'Lavandina Ayudín 1L', sku: 'LIM-002', barcode: '7790200000112', category: 'Limpieza', description: 'Lavandina concentrada 55g/L 1 litro', costPrice: 380, salePrice: 580, stock: 3, minStock: 10, maxStock: 60, unit: 'litro', supplier: 's4', location: 'D2', expirationDate: '2025-10-01', createdAt: '2024-03-10', updatedAt: '2024-06-01' },
  { id: 'p17', name: 'Jabón Ala 800g', sku: 'LIM-003', barcode: '7790300000123', category: 'Limpieza', description: 'Jabón en polvo para ropa 800g', costPrice: 780, salePrice: 1100, stock: 25, minStock: 10, maxStock: 60, unit: 'unidad', supplier: 's4', location: 'D3', expirationDate: '2026-12-01', createdAt: '2024-03-10', updatedAt: '2024-06-01' },
  // Higiene
  { id: 'p18', name: 'Shampoo Pantene 400ml', sku: 'HIG-001', barcode: '7500435000134', category: 'Higiene personal', description: 'Shampoo pelo normal 400ml', costPrice: 1200, salePrice: 1750, stock: 18, minStock: 8, maxStock: 40, unit: 'unidad', supplier: 's4', location: 'E1', expirationDate: '2026-06-01', createdAt: '2024-03-15', updatedAt: '2024-06-01' },
  { id: 'p19', name: 'Papel Higiénico Elite 4 rollos', sku: 'HIG-002', barcode: '7790400000145', category: 'Higiene personal', description: 'Papel higiénico doble hoja 4 rollos', costPrice: 680, salePrice: 980, stock: 50, minStock: 20, maxStock: 120, unit: 'pack', supplier: 's4', location: 'E2', expirationDate: '2027-01-01', createdAt: '2024-03-15', updatedAt: '2024-06-01' },
  // Snacks
  { id: 'p20', name: 'Papas Lays 150g', sku: 'SNA-001', barcode: '7793000000156', category: 'Snacks y golosinas', description: 'Papas fritas sabor clásico 150g', costPrice: 480, salePrice: 750, stock: 30, minStock: 15, maxStock: 80, unit: 'unidad', supplier: 's5', location: 'F1', expirationDate: '2025-09-30', createdAt: '2024-02-20', updatedAt: '2024-06-01' },
  { id: 'p21', name: 'Galletitas Oreo 117g', sku: 'SNA-002', barcode: '7622210000167', category: 'Snacks y golosinas', description: 'Galletitas rellenas chocolate 117g', costPrice: 350, salePrice: 550, stock: 45, minStock: 15, maxStock: 100, unit: 'unidad', supplier: 's5', location: 'F2', expirationDate: '2025-11-15', createdAt: '2024-02-20', updatedAt: '2024-06-01' },
  { id: 'p22', name: 'Chocolate Milka 150g', sku: 'SNA-003', barcode: '7622210000178', category: 'Snacks y golosinas', description: 'Chocolate con leche 150g', costPrice: 750, salePrice: 1100, stock: 22, minStock: 10, maxStock: 60, unit: 'unidad', supplier: 's5', location: 'F3', expirationDate: '2025-10-20', createdAt: '2024-02-20', updatedAt: '2024-06-01' },
]

// Generate realistic sales history for the past 60 days
function generateSalesHistory() {
  const sales = []
  const today = new Date()
  let saleId = 1

  for (let daysAgo = 59; daysAgo >= 0; daysAgo--) {
    const date = subDays(today, daysAgo)
    const numSales = Math.floor(Math.random() * 8) + 3
    for (let s = 0; s < numSales; s++) {
      const numItems = Math.floor(Math.random() * 4) + 1
      const items = []
      let total = 0
      for (let i = 0; i < numItems; i++) {
        const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)]
        const qty = Math.floor(Math.random() * 3) + 1
        const subtotal = product.salePrice * qty
        total += subtotal
        items.push({
          productId: product.id,
          name: product.name,
          quantity: qty,
          price: product.salePrice,
          total: subtotal
        })
      }
      const payments = ['efectivo', 'tarjeta débito', 'tarjeta crédito', 'transferencia']
      sales.push({
        id: `sale-${saleId++}`,
        items,
        total,
        payment: payments[Math.floor(Math.random() * payments.length)],
        date: format(date, 'yyyy-MM-dd HH:mm:ss'),
        cashier: 'Admin',
        discount: 0
      })
    }
  }
  return sales
}

// Generate purchase history
function generatePurchaseHistory() {
  const purchases = []
  const today = new Date()
  const statuses = ['recibido', 'recibido', 'recibido', 'pendiente', 'parcial']
  for (let i = 0; i < 15; i++) {
    const supplier = sampleSuppliers[Math.floor(Math.random() * sampleSuppliers.length)]
    const date = subDays(today, Math.floor(Math.random() * 45))
    const numItems = Math.floor(Math.random() * 4) + 1
    const items = []
    let total = 0
    for (let j = 0; j < numItems; j++) {
      const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)]
      const qty = Math.floor(Math.random() * 20) + 5
      const cost = product.costPrice * qty
      total += cost
      items.push({
        productId: product.id,
        name: product.name,
        quantity: qty,
        cost: product.costPrice,
        total: cost
      })
    }
    purchases.push({
      id: `pur-${i + 1}`,
      supplier: supplier.id,
      supplierName: supplier.name,
      items,
      total,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      date: format(date, 'yyyy-MM-dd'),
      expectedDate: format(subDays(date, -7), 'yyyy-MM-dd'),
      notes: '',
      createdAt: format(date, 'yyyy-MM-dd HH:mm:ss')
    })
  }
  return purchases
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useStore = create(
  persist(
    (set, get) => ({
      // ── State ──
      currentPage: 'dashboard',
      sidebarOpen: true,
      products: sampleProducts,
      sales: generateSalesHistory(),
      purchases: generatePurchaseHistory(),
      suppliers: sampleSuppliers,
      categories: CATEGORIES,
      units: UNITS,
      notifications: [],
      settings: {
        businessName: 'Mi Comercio',
        businessType: 'Almacén / Despensa',
        currency: 'ARS',
        currencySymbol: '$',
        taxRate: 21,
        lowStockThreshold: 10,
        language: 'es',
        theme: 'light',
        address: '',
        phone: '',
        email: '',
        aiApiKey: '',
        aiEnabled: true,
      },
      aiMessages: [
        {
          role: 'assistant',
          content: '¡Hola! Soy tu asistente de IA para gestión de inventario. Puedo ayudarte a analizar tu stock, predecir demanda, sugerir precios y mucho más. ¿En qué te puedo ayudar hoy?',
          time: new Date().toISOString()
        }
      ],

      // ── Navigation ──
      setPage: (page) => set({ currentPage: page }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // ── Products CRUD ──
      addProduct: (product) => {
        const newProduct = {
          ...product,
          id: `p${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({ products: [...s.products, newProduct] }))
        get().addNotification('success', `Producto "${product.name}" agregado correctamente`)
      },

      updateProduct: (id, updates) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          )
        }))
        get().addNotification('success', 'Producto actualizado correctamente')
      },

      deleteProduct: (id) => {
        const product = get().products.find((p) => p.id === id)
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
        get().addNotification('info', `Producto "${product?.name}" eliminado`)
      },

      adjustStock: (id, quantity, reason) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id
              ? { ...p, stock: Math.max(0, p.stock + quantity), updatedAt: new Date().toISOString() }
              : p
          )
        }))
        get().addNotification('info', `Stock ajustado: ${quantity > 0 ? '+' : ''}${quantity} unidades`)
      },

      // ── Sales ──
      addSale: (saleData) => {
        const sale = {
          ...saleData,
          id: `sale-${Date.now()}`,
          date: new Date().toISOString(),
          cashier: get().settings.businessName || 'Admin',
        }
        set((s) => ({ sales: [sale, ...s.sales] }))
        // Update stock for each item sold
        saleData.items.forEach(item => {
          get().adjustStock(item.productId, -item.quantity, 'Venta')
        })
        get().addNotification('success', `Venta registrada: $${sale.total.toLocaleString('es-AR')}`)
        return sale
      },

      // ── Purchases ──
      addPurchase: (purchaseData) => {
        const purchase = {
          ...purchaseData,
          id: `pur-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ purchases: [purchase, ...s.purchases] }))
        if (purchaseData.status === 'recibido') {
          purchaseData.items.forEach(item => {
            get().adjustStock(item.productId, item.quantity, 'Compra recibida')
          })
        }
        get().addNotification('success', `Orden de compra creada: $${purchase.total.toLocaleString('es-AR')}`)
      },

      updatePurchaseStatus: (id, status) => {
        const purchase = get().purchases.find(p => p.id === id)
        set((s) => ({
          purchases: s.purchases.map((p) => p.id === id ? { ...p, status } : p)
        }))
        if (status === 'recibido' && purchase && purchase.status !== 'recibido') {
          purchase.items.forEach(item => {
            get().adjustStock(item.productId, item.quantity, 'Compra recibida')
          })
          get().addNotification('success', 'Compra marcada como recibida. Stock actualizado.')
        }
      },

      deletePurchase: (id) => {
        set((s) => ({ purchases: s.purchases.filter((p) => p.id !== id) }))
      },

      // ── Suppliers ──
      addSupplier: (supplier) => {
        const newSupplier = { ...supplier, id: `s${Date.now()}`, createdAt: new Date().toISOString() }
        set((s) => ({ suppliers: [...s.suppliers, newSupplier] }))
        get().addNotification('success', `Proveedor "${supplier.name}" agregado`)
      },

      updateSupplier: (id, updates) => {
        set((s) => ({
          suppliers: s.suppliers.map((sup) => sup.id === id ? { ...sup, ...updates } : sup)
        }))
      },

      deleteSupplier: (id) => {
        set((s) => ({ suppliers: s.suppliers.filter((sup) => sup.id !== id) }))
      },

      // ── Categories ──
      addCategory: (cat) => {
        set((s) => ({ categories: [...s.categories, cat] }))
      },

      // ── Settings ──
      updateSettings: (updates) => {
        set((s) => ({ settings: { ...s.settings, ...updates } }))
        get().addNotification('success', 'Configuración guardada')
      },

      // ── Notifications ──
      addNotification: (type, message) => {
        const notif = { id: Date.now(), type, message, time: new Date().toISOString(), read: false }
        set((s) => ({ notifications: [notif, ...s.notifications.slice(0, 49)] }))
      },

      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
        }))
      },

      clearNotifications: () => set({ notifications: [] }),

      // ── AI Messages ──
      addAIMessage: (message) => {
        set((s) => ({ aiMessages: [...s.aiMessages, message] }))
      },

      clearAIMessages: () => {
        set({
          aiMessages: [{
            role: 'assistant',
            content: '¡Hola! Soy tu asistente de IA. ¿En qué te puedo ayudar?',
            time: new Date().toISOString()
          }]
        })
      },

      // ── Computed Helpers ──
      getLowStockProducts: () => {
        return get().products.filter(p => p.stock > 0 && p.stock <= p.minStock)
      },

      getOutOfStockProducts: () => {
        return get().products.filter(p => p.stock === 0)
      },

      getExpiringProducts: (days = 30) => {
        const limit = new Date()
        limit.setDate(limit.getDate() + days)
        return get().products.filter(p => {
          if (!p.expirationDate) return false
          return new Date(p.expirationDate) <= limit
        })
      },

      getTodaySales: () => {
        const today = format(new Date(), 'yyyy-MM-dd')
        return get().sales.filter(s => s.date.startsWith(today))
      },

      getInventoryValue: () => {
        return get().products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0)
      },

      getSalesByPeriod: (days = 7) => {
        const cutoff = subDays(new Date(), days)
        return get().sales.filter(s => new Date(s.date) >= cutoff)
      },
    }),
    {
      name: 'stockmaster-storage',
      partialize: (state) => ({
        products: state.products,
        sales: state.sales,
        purchases: state.purchases,
        suppliers: state.suppliers,
        categories: state.categories,
        settings: state.settings,
        aiMessages: state.aiMessages,
        notifications: state.notifications,
      }),
    }
  )
)

export default useStore
