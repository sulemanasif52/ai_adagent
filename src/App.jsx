import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Settings from './components/Settings'
import Chatbot from './components/Chatbot'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import CreateAd from './pages/CreateAd'
import Analytics from './pages/Analytics'
import CRM from './pages/CRM'
import Billing from './pages/Billing'
import AdClick from './pages/AdClick'

function DashboardLayout({ children }) {
    const [settingsOpen, setSettingsOpen] = useState(false)

    return (
        <div style={{ 
            display: 'flex', 
            minHeight: '100vh', 
            backgroundColor: 'var(--bg-primary)',
        }}>
            <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 'var(--sidebar-width)', position: 'relative' }}>
                <Header />
                <main style={{ padding: '2rem 3rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative' }}>
                    {children}
                </main>
            </div>
            <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
    )
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Public ad click landing page */}
            <Route path="/ad" element={<AdClick />} />

            {/* Wrapped dashboard routes */}
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/create-ad" element={<DashboardLayout><CreateAd /></DashboardLayout>} />
            <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
            <Route path="/crm" element={<DashboardLayout><CRM /></DashboardLayout>} />
            <Route path="/billing" element={<DashboardLayout><Billing /></DashboardLayout>} />
            
            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App

