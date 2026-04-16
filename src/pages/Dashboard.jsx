import React, { useState } from 'react'
import { Plus, ArrowRight, PlayCircle, PauseCircle, CheckCircle, Zap, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const campaigns = [
  { id: 1, name: 'Summer Collection', status: 'Active', spend: '$240', performance: '142 clicks' },
  { id: 2, name: 'Retargeting - Cart Abandoners', status: 'Active', spend: '$85', performance: '12 conversions' },
  { id: 3, name: 'Brand Awareness Q1', status: 'Completed', spend: '$1,200', performance: '45k impressions' },
]

const StatusBadge = ({ status }) => {
    let color = 'var(--text-secondary)'
    let bg = 'var(--bg-tertiary)'
    let Icon = PlayCircle

    if (status === 'Active') {
        color = 'var(--accent-success)'
        bg = 'rgba(16, 185, 129, 0.1)'
        Icon = PlayCircle
    } else if (status === 'Completed') {
        color = 'var(--text-secondary)'
        bg = 'var(--bg-tertiary)'
        Icon = CheckCircle
    } else if (status === 'Paused') {
        color = 'var(--accent-warning)'
        bg = 'rgba(245, 158, 11, 0.1)'
        Icon = PauseCircle
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: color, background: bg }}>
            <Icon size={12} /> {status}
        </span>
    )
}

const Dashboard = () => {
    const navigate = useNavigate()
    const [optimizationMode, setOptimizationMode] = useState('auto')

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
                
                {campaigns.length > 0 ? (
                    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Campaign</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Spend</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Performance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((campaign) => (
                                        <tr key={campaign.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{campaign.name}</td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}><StatusBadge status={campaign.status} /></td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{campaign.spend}</td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{campaign.performance}</td>
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

            {/* Optimization Mode Toggle */}
            <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Campaign Optimization</h3>
                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div 
                            onClick={() => setOptimizationMode('auto')}
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
                            onClick={() => setOptimizationMode('manual')}
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
        </div>
    )
}

export default Dashboard

