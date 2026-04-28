import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Settings from './components/Settings'

import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import CreateAd from './pages/CreateAd'
import Analytics from './pages/Analytics'
import CRM from './pages/CRM'
import Billing from './pages/Billing'
import AdClick from './pages/AdClick'

import { AuthProvider, useAuth } from './lib/auth-context'

function FullPageLoader() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Loading…
        </div>
    )
}

function RequireAuth({ children }) {
    const { user, loading } = useAuth()
    const location = useLocation()
    if (loading) return <FullPageLoader />
    if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />
    return children
}

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
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/ad" element={<AdClick />} />

                <Route path="/dashboard" element={<RequireAuth><DashboardLayout><Dashboard /></DashboardLayout></RequireAuth>} />
                <Route path="/create-ad" element={<RequireAuth><DashboardLayout><CreateAd /></DashboardLayout></RequireAuth>} />
                <Route path="/analytics" element={<RequireAuth><DashboardLayout><Analytics /></DashboardLayout></RequireAuth>} />
                <Route path="/crm" element={<RequireAuth><DashboardLayout><CRM /></DashboardLayout></RequireAuth>} />
                <Route path="/billing" element={<RequireAuth><DashboardLayout><Billing /></DashboardLayout></RequireAuth>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    )
}

export default App
