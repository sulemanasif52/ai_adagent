import React, { useEffect, useState } from 'react'
import { Plus, PlayCircle, PauseCircle, CheckCircle, Zap, ShieldCheck, Instagram, ArrowRight } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { getPreferences, putPreferences, getIgPosts, listCampaigns, listRecommendations } from '../lib/server'

const STATUS_STYLES = {
    active:    { color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.1)', Icon: PlayCircle, label: 'Active' },
    archived:  { color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)',       Icon: CheckCircle, label: 'Archived' },
    paused:    { color: 'var(--accent-warning)', bg: 'rgba(245, 158, 11, 0.1)', Icon: PauseCircle, label: 'Paused' },
    draft:     { color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)',        Icon: PauseCircle, label: 'Draft' },
}

const StatusBadge = ({ status }) => {
    const s = STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.draft
    const { color, bg, Icon, label } = s
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: color, background: bg }}>
            <Icon size={12} /> {label}
        </span>
    )
}

const fmtMoney = n => n == null ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const fmtPct   = n => n == null ? '—' : `${(Number(n) * 100).toFixed(0)}%`

const Dashboard = () => {
    const navigate = useNavigate()
    const [optimizationMode, setOptimizationMode] = useState('manual')
    const [recentPosts, setRecentPosts] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [campaignsLoading, setCampaignsLoading] = useState(true)
    const [campaignsError, setCampaignsError] = useState('')
    const [recs, setRecs] = useState([])

    useEffect(() => {
        getPreferences()
            .then(p => setOptimizationMode(p.optimization_mode || 'manual'))
            .catch(() => {})
        getIgPosts({ limit: 4 })
            .then(r => setRecentPosts(r.posts || []))
            .catch(() => {}) // IG not connected yet — silently hide widget
        listCampaigns({ limit: 50 })
            .then(r => setCampaigns(r.campaigns || []))
            .catch(e => setCampaignsError(e.message))
            .finally(() => setCampaignsLoading(false))
        listRecommendations({ active: '1' })
            .then(r => setRecs(r.recommendations || []))
            .catch(() => {})
    }, [])

    const updateMode = mode => {
        setOptimizationMode(mode)
        putPreferences({ optimization_mode: mode }).catch(() => {})
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Top Action Section */}
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderStyle: 'dashed' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Ready to reach more customers?</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '400px' }}>Let our AI build, target, and optimize your next ad campaign effortlessly.</p>
                <button className="btn-primary" onClick={() => navigate('/create-ad')} style={{ marginTop: '0.5rem', padding: '0.75rem 1.5rem' }}>
                    <Plus size={18} style={{ marginRight: '0.5rem' }} /> Create New Ad
                </button>
            </div>

            {/* Campaign List */}
            <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active & Recent Campaigns</h3>

                {campaignsLoading ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading…</div>
                ) : campaignsError ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-warning)' }}>{campaignsError}</div>
                ) : campaigns.length > 0 ? (
                    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Campaign</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Spend</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Leads</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>ROI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((c) => (
                                        <tr
                                            key={c.id}
                                            onClick={() => navigate(`/campaigns/${c.id}`)}
                                            style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{c.name}</td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}><StatusBadge status={c.status} /></td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{fmtMoney(c.summary?.spend)}</td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{c.summary?.leads ?? 0}</td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: c.summary?.roi > 0 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>{fmtPct(c.summary?.roi)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <p>No campaigns yet. Click 'Create New Ad' to get started.</p>
                    </div>
                )}
            </div>

            {/* Recommendations panel */}
            {recs.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={20} color="var(--accent-warning)" /> AI Insights
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {recs.slice(0, 6).map(r => (
                            <div key={r.id} className="card" style={{
                                padding: '1.25rem',
                                borderLeft: `3px solid ${r.severity === 'critical' ? '#EF4444' : r.severity === 'warn' ? 'var(--accent-warning)' : 'var(--accent-primary)'}`,
                            }}>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>{r.type}</div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem' }}>{r.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Optimization Mode Toggle */}
            <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Campaign Optimization</h3>
                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div 
                            onClick={() => updateMode('auto')}
                            style={{ 
                                flex: 1, 
                                border: `2px solid ${optimizationMode === 'auto' ? 'var(--accent-success)' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                background: optimizationMode === 'auto' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={{ 
                                    padding: '0.6rem', 
                                    borderRadius: 'var(--radius-md)', 
                                    background: optimizationMode === 'auto' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                                    color: optimizationMode === 'auto' ? 'var(--accent-success)' : 'var(--text-tertiary)'
                                }}>
                                    <Zap size={20} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Auto-Optimization Mode</h4>
                                <div style={{ 
                                    marginLeft: 'auto',
                                    width: '20px', height: '20px', borderRadius: '50%', 
                                    border: `2px solid ${optimizationMode === 'auto' ? 'var(--accent-success)' : 'var(--border-color)'}`,
                                    background: optimizationMode === 'auto' ? 'var(--accent-success)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {optimizationMode === 'auto' && <CheckCircle size={12} color="white" />}
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                AI automatically shifts budget towards best-performing creatives, audiences, and placements in real time. No manual intervention needed.
                            </p>
                        </div>

                        <div 
                            onClick={() => updateMode('manual')}
                            style={{ 
                                flex: 1, 
                                border: `2px solid ${optimizationMode === 'manual' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                background: optimizationMode === 'manual' ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={{ 
                                    padding: '0.6rem', 
                                    borderRadius: 'var(--radius-md)', 
                                    background: optimizationMode === 'manual' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-tertiary)',
                                    color: optimizationMode === 'manual' ? 'var(--accent-primary)' : 'var(--text-tertiary)'
                                }}>
                                    <ShieldCheck size={20} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Manual Approval Mode</h4>
                                <div style={{ 
                                    marginLeft: 'auto',
                                    width: '20px', height: '20px', borderRadius: '50%', 
                                    border: `2px solid ${optimizationMode === 'manual' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    background: optimizationMode === 'manual' ? 'var(--accent-primary)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {optimizationMode === 'manual' && <CheckCircle size={12} color="white" />}
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                You review all AI recommendations before they are applied. Full control over budget shifts, creative swaps, and scaling decisions.
                            </p>
                        </div>
                    </div>

                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.75rem', 
                        padding: '1rem', 
                        background: optimizationMode === 'auto' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)', 
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${optimizationMode === 'auto' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)'}`,
                        transition: 'all 0.2s'
                    }}>
                        {optimizationMode === 'auto' ? <Zap size={16} color="var(--accent-success)" /> : <ShieldCheck size={16} color="var(--accent-primary)" />}
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {optimizationMode === 'auto' 
                                ? 'Currently active: AI is automatically optimizing your campaigns for maximum ROI.' 
                                : 'Currently active: You will be notified before any optimization changes are applied.'}
                        </span>
                    </div>
                </div>
            </div>

            {recentPosts.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Instagram size={20} color="#E1306C" /> Recent Instagram posts
                        </h3>
                        <Link to="/analytics" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            See all <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                        {recentPosts.map(p => (
                            <a key={p.id} href={p.permalink || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    {(p.thumbnailUrl || p.mediaUrl) ? (
                                        <img src={p.thumbnailUrl || p.mediaUrl} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        <div style={{ aspectRatio: '1/1', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                                            <Instagram size={28} />
                                        </div>
                                    )}
                                    <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>♥ {(p.likeCount || 0).toLocaleString()}</span>
                                        <span>💬 {(p.commentsCount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard

