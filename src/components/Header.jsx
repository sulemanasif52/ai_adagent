import React, { useState, useEffect, useRef } from 'react'
import { Bell, User, ChevronDown, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const notifications = [
    { id: 1, type: 'warning', title: 'Budget Limit Reached', desc: 'Campaign "Summer Retargeting" has reached its daily limit.', time: '10m ago', icon: AlertTriangle, color: 'var(--accent-warning)' },
    { id: 2, type: 'success', title: 'Scaling Opportunity', desc: 'AI detected high ROI in Texas. Recommend increasing budget.', time: '1h ago', icon: TrendingUp, color: 'var(--accent-success)' },
    { id: 3, type: 'info', title: 'Optimization Applied', desc: 'Paused underperforming asset #3 in YouTube preroll ad.', time: '2h ago', icon: CheckCircle, color: 'var(--accent-primary)' }
]

const Header = () => {
    const location = useLocation()
    const path = location.pathname.split('/')[1]
    const title = path ? path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ') : 'Dashboard'
    
    const [showNotif, setShowNotif] = useState(false)
    const notifRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <header style={{ 
            height: 'var(--header-height)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0 3rem',
            background: 'var(--bg-primary)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 40
        }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>{title}</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ position: 'relative' }} ref={notifRef}>
                    <button onClick={() => setShowNotif(!showNotif)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', position: 'relative', cursor: 'pointer', padding: '0.25rem' }}>
                        <Bell size={20} />
                        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }}></div>
                    </button>

                    {showNotif && (
                        <div className="card" style={{ position: 'absolute', top: '100%', right: 0, width: '320px', padding: 0, overflow: 'hidden', zIndex: 50, border: '1px solid var(--border-color)', marginTop: '0.5rem', background: 'var(--bg-secondary)' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <h3 style={{ margin: 0, fontSize: '0.875rem' }}>Notifications</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {notifications.map(n => {
                                    const Icon = n.icon
                                    return (
                                        <div key={n.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${n.color}15`, color: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Icon size={16} />
                                            </div>
                                            <div>
                                                <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>{n.title}</p>
                                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.desc}</p>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>{n.time}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <button style={{ width: '100%', padding: '0.75rem', border: 'none', background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                                View all alerts
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #38BDF8, #A78BFA)', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        SJ
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Sarah Jenkins</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pro Plan</p>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
