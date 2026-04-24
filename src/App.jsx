import React from 'react'
import useStore from './store/useStore'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Suppliers from './pages/Suppliers'
import Reports from './pages/Reports'
import AIAssistant from './pages/AIAssistant'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

const PAGES = {
  dashboard: Dashboard,
  inventory: Inventory,
  sales: Sales,
  purchases: Purchases,
  suppliers: Suppliers,
  reports: Reports,
  ai: AIAssistant,
  alerts: Alerts,
  settings: Settings,
}

export default function App() {
  const currentPage = useStore(s => s.currentPage)
  const Page = PAGES[currentPage] || Dashboard

  return (
    <Layout>
      <Page />
    </Layout>
  )
}
