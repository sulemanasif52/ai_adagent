import React, { useState, useEffect } from 'react'
import { Users, Search, Filter, Mail, Phone, ExternalLink, MousePointerClick } from 'lucide-react'
import { Link } from 'react-router-dom'

const initialLeads = [
  { id: 1, name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '+1 (555) 019-2834', source: 'Facebook Ads - Summer Collec...', value: '$450', date: 'Just now', status: 'New', audience: 'Women 25-34' },
  { id: 2, name: 'Michael Chen', email: 'mchen99@company.net', phone: '+1 (555) 837-1120', source: 'Instagram - Retargeting', value: '$1,200', date: '2 hours ago', status: 'Contacted', audience: 'Tech Enthusiasts' },
  { id: 3, name: 'Jessica Torres', email: 'jess.torres@gmail.com', phone: '+1 (555) 342-9981', source: 'YouTube Pre-roll', value: '$150', date: 'Yesterday', status: 'Converted', audience: 'Millennials 25-34' },
  { id: 4, name: 'David Smith', email: 'dsmith.business@org.co', phone: '+1 (555) 776-3241', source: 'Google Search - Exact Match', value: '$800', date: 'Yesterday', status: 'New', audience: 'SaaS Decision Makers' },
  { id: 5, name: 'Emily Larson', email: 'emilyl@webmail.com', phone: '+1 (555) 231-0098', source: 'Facebook Ads - Broad', value: '$250', date: 'Apr 14, 2026', status: 'Converted', audience: 'Fitness Shoppers' },
]

const StatusBadge = ({ status }) => {
    const colors = {
        'New': { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--accent-primary)' },
        'Contacted': { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--accent-warning)' },
        'Converted': { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--accent-success)' }
    }
    const c = colors[status] || colors['New']

    return (
        <span style={{ 
            display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', 
            background: c.bg, color: c.text, borderRadius: 'var(--radius-full)', 
            fontSize: '0.75rem', fontWeight: 600 
        }}>
            {status}
        </span>
    )
}

const CRM = () => {
    const [leads, setLeads] = useState(initialLeads)

    // Merge in any leads captured from ad clicks
    useEffect(() => {
        const captured = JSON.parse(localStorage.getItem('captured_leads') || '[]')
        if (captured.length > 0) {
            const capturedLeads = captured.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: '—',
                source: c.source || 'Ad Click',
                value: '—',
                date: c.date,
                status: c.status || 'New',
                audience: c.audience || 'General',
                fromAdClick: true,
            }))
            setLeads([...capturedLeads, ...initialLeads])
        }
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Lead Tracking (CRM)</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage leads captured directly from your AI ad campaigns.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link to="/ad?product=summer-collection" target="_blank" className="btn-primary" style={{ 
                        textDecoration: 'none', padding: '0.6rem 1.25rem', fontSize: '0.875rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
                    }}>
                        <MousePointerClick size={16} /> Simulate Ad Click
                    </Link>
                    <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)' }}>
                        <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                            <Users size={20} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Leads</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{leads.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-lg" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="text" className="input-base" placeholder="Search name or email..." style={{ paddingLeft: '2.5rem', background: 'var(--bg-secondary)', border: 'none' }} />
                    </div>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={16} /> Filter
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Lead Info</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Source Campaign</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Est. Value</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Date Captured</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Best Audience</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name}</p>
                                            {lead.fromAdClick && (
                                                <span style={{ 
                                                    padding: '0.15rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)',
                                                    color: 'var(--accent-success)', borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap',
                                                }}>AD CLICK</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}><Mail size={12} /> {lead.email}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{lead.source}</span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--accent-success)' }}>{lead.value}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{lead.date}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ 
                                            display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem',
                                            background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)',
                                            borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {lead.audience}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}><StatusBadge status={lead.status} /></td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }} title="View Details">
                                            <ExternalLink size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default CRM
