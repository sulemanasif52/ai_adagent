import React, { useState, useEffect, useMemo } from 'react'
import { Users, Search, Filter, Mail, Phone, ExternalLink, MousePointerClick, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listLeads, getLead, updateLead } from '../lib/server'

const STATUS_VALUES = ['new', 'engaged', 'converted', 'lost']

function relativeDate(d) {
    if (!d) return '—'
    const date = new Date(d)
    if (isNaN(date.getTime())) return '—'
    const diff = (Date.now() - date.getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`
    if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`
    if (diff < 86400 * 7) return `${Math.round(diff / 86400)} d ago`
    return date.toLocaleDateString()
}

const StatusBadge = ({ status }) => {
    const colors = {
        new:       { bg: 'rgba(79, 70, 229, 0.1)', text: 'var(--accent-primary)' },
        engaged:   { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--accent-warning)' },
        converted: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--accent-success)' },
        lost:      { bg: 'rgba(239, 68, 68, 0.1)',  text: '#EF4444' },
    }
    const c = colors[status?.toLowerCase()] || colors.new
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem',
            background: c.bg, color: c.text, borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
        }}>
            {status || 'new'}
        </span>
    )
}

const LeadDetailsModal = ({ leadId, onClose, onUpdate }) => {
    const [lead, setLead] = useState(null)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        if (!leadId) return
        getLead(leadId).then(r => setLead(r.lead)).finally(() => setLoading(false))
    }, [leadId])
    if (!leadId) return null
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
                {loading || !lead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}><Loader2 size={16} className="spin" /> Loading…</div>
                ) : (
                    <>
                        <h2 style={{ marginTop: 0 }}>{lead.fullName}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>{lead.email}</p>
                        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
                            {lead.phone && <Row k="Phone" v={lead.phone} />}
                            {lead.source && <Row k="Source" v={lead.source} />}
                            {lead.audienceTag && <Row k="Audience" v={lead.audienceTag} />}
                            {lead.campaign && <Row k="Campaign" v={lead.campaign.name} />}
                            <Row k="Captured" v={new Date(lead.createdAt).toLocaleString()} />
                            <Row k="Score" v={lead.score != null ? `${(lead.score * 100).toFixed(0)}%` : '—'} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                            {STATUS_VALUES.map(s => (
                                <button key={s} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textTransform: 'capitalize', opacity: lead.status === s ? 1 : 0.6 }}
                                    onClick={async () => { await updateLead(lead.id, { status: s }); onUpdate(); onClose() }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </>
                )}
                <style>{`.spin { animation: spin 1s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        </div>
    )
}
const Row = ({ k, v }) => <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: 'var(--text-secondary)' }}>{k}</span><span>{v}</span></div>

const CRM = () => {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [selectedLeadId, setSelectedLeadId] = useState(null)

    const refresh = () => {
        setLoading(true)
        listLeads({ search: search || undefined, status: statusFilter || undefined, limit: 200 })
            .then(r => setLeads(r.leads || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        const t = setTimeout(refresh, 250)  // debounce
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter])

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
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="text" className="input-base" placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem', background: 'var(--bg-secondary)', border: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {showFilters && (
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base" style={{ background: 'var(--bg-secondary)', border: 'none', textTransform: 'capitalize' }}>
                                <option value="">All statuses</option>
                                {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}
                        <button onClick={() => setShowFilters(s => !s)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={16} /> Filter
                        </button>
                    </div>
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
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}><Loader2 size={16} className="spin" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Loading…</td></tr>
                            ) : error ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-warning)' }}>{error}</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No leads yet — share your AdClick page to capture some.</td></tr>
                            ) : leads.map((lead) => (
                                <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.fullName}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}><Mail size={12} /> {lead.email}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{lead.source || '—'}</span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--accent-success)' }}>{lead.estValue != null ? `$${lead.estValue}` : '—'}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{relativeDate(lead.createdAt)}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem',
                                            background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)',
                                            borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {lead.audienceTag || 'General'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}><StatusBadge status={lead.status} /></td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <button onClick={() => setSelectedLeadId(lead.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }} title="View Details">
                                            <ExternalLink size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <LeadDetailsModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} onUpdate={refresh} />
        </div>
    )
}

export default CRM
