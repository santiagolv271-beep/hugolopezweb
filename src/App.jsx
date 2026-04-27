import React, { useState, useEffect, useRef } from 'react'
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
  const [displayPage, setDisplayPage] = useState(currentPage)
  const [transitioning, setTransitioning] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (currentPage === displayPage) return
    setTransitioning(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setDisplayPage(currentPage)
      setTransitioning(false)
    }, 120)
    return () => clearTimeout(timeoutRef.current)
  }, [currentPage])

  const Page = PAGES[displayPage] || Dashboard

  return (
    <Layout>
      <div
        className={`transition-all duration-150 ease-out ${
          transitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        }`}
      >
        <Page />
      </div>
    </Layout>
  )
}
