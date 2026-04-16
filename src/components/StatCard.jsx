import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

const StatCard = ({ title, value, trend, trendValue, icon: Icon }) => {
    const isPositive = trend === 'up'

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>{title}</p>
                    <h3 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>{value}</h3>
                </div>
                <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(79, 70, 229, 0.1)',
                    color: 'var(--accent-primary)',
                }}>
                    <Icon size={22} />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    color: isPositive ? 'var(--accent-success)' : 'var(--text-secondary)',
                    fontWeight: 500,
                    background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                }}>
                    {isPositive ? <ArrowUpRight size={14} style={{ marginRight: '2px' }} /> : <ArrowDownRight size={14} style={{ marginRight: '2px' }} />}
                    {trendValue}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>vs last month</span>
            </div>
        </div>
    )
}

export default StatCard
