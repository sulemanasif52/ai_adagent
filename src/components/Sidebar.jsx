import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, BarChart3, CreditCard, Users, Settings as SettingsIcon, TrendingUp } from 'lucide-react'

const Sidebar = ({ onOpenSettings }) => {
    const location = useLocation()

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/create-ad', label: 'Create Ad', icon: PlusCircle },
        { path: '/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/trends',    label: 'Market Pulse', icon: TrendingUp },
        { path: '/crm', label: 'Leads / CRM', icon: Users },
        { path: '/billing', label: 'Billing', icon: CreditCard },
    ]

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
                    AIMarket <span className="text-gradient">Pro</span>
                </h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                color: isActive ? '#0F172A' : 'var(--text-secondary)',
                                background: isActive ? 'linear-gradient(90deg, #38BDF8, #A78BFA)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                                fontWeight: isActive ? 700 : 500,
                                boxShadow: isActive ? '0 4px 12px rgba(56, 189, 248, 0.2)' : 'none',
                            }}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#0F172A' : 'currentColor'} />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
            
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                <button 
                    onClick={onOpenSettings}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        fontWeight: 500
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <SettingsIcon size={18} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
