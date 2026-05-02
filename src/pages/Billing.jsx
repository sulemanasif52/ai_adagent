import React, { useEffect, useState } from 'react'
import { CreditCard, ShieldCheck, History, Facebook, MonitorPlay, Zap, Youtube, Instagram, Info, RefreshCw, Loader2, CheckCircle, Lock } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { getIgAccount, getFbPage, syncInstagram } from '../lib/server'

const ComingSoonTip = ({ children, label = 'Coming soon — currently in beta' }) => (
    <span title={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'not-allowed' }}>
        {children}
    </span>
)

const ComingSoonBadge = () => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.15rem 0.5rem', background: 'rgba(167, 139, 250, 0.15)',
        color: '#A78BFA', borderRadius: '999px',
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em',
    }}>
        <Lock size={9} /> Soon
    </span>
)

const disabledStyle = {
    opacity: 0.55,
    cursor: 'not-allowed',
    pointerEvents: 'auto', // still allow tooltip to show
}

const Billing = () => {
    const { user } = useAuth()
    const [igAccount, setIgAccount] = useState(null)
    const [fbPage, setFbPage] = useState(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [syncMessage, setSyncMessage] = useState('')

    useEffect(() => {
        Promise.allSettled([getIgAccount(), getFbPage()])
            .then(([ig, fb]) => {
                if (ig.status === 'fulfilled') setIgAccount(ig.value)
                if (fb.status === 'fulfilled') setFbPage(fb.value)
            })
            .finally(() => setLoading(false))
    }, [])

    const handleManageSync = async () => {
        setSyncing(true)
        setSyncMessage('')
        try {
            const r = await syncInstagram()
            setSyncMessage(`Synced ${r.postsSynced || 0} posts at ${new Date(r.syncedAt).toLocaleTimeString()}`)
            const ig = await getIgAccount().catch(() => null)
            if (ig) setIgAccount(ig)
        } catch (err) {
            setSyncMessage(`Sync failed: ${err.message || 'unknown'}`)
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Billing & Integrations</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your ad account connections. AIMarket Pro is free during beta — no service fee yet.</p>
            </div>

            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                padding: '1.25rem 1.5rem',
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 'var(--radius-lg)'
            }}>
                <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.15)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                    <Info size={18} color="var(--accent-primary)" />
                </div>
                <div>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>How this will work</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Today:</strong> Connect Facebook + Instagram to read your analytics and generate ad creative. Everything is free during beta.
                        <br />
                        <strong style={{ color: 'var(--text-primary)' }}>Coming soon:</strong> Direct ad publishing to Meta/Google/TikTok (waiting on platform reviews) and a paid Pro plan for unlimited AI generations.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '2rem' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Ad Account Connections */}
                    <div className="card shadow-lg" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={20} color="var(--accent-primary)" /> Ad Account Connections
                            </h2>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Networks linked to your account. Read-only for now — direct publishing arrives after platform approvals.</p>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Instagram — real */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: `1px solid ${igAccount ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-lg)', background: igAccount ? 'rgba(16, 185, 129, 0.04)' : 'transparent' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Instagram size={32} color="#E1306C" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            Instagram Business
                                            {igAccount && <CheckCircle size={14} color="var(--accent-success)" />}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {loading ? 'Loading…' : igAccount ? `@${igAccount.username} · ${igAccount.followers?.toLocaleString() || 0} followers${igAccount.lastSyncedAt ? ` · last sync ${new Date(igAccount.lastSyncedAt).toLocaleTimeString()}` : ''}` : 'Not connected — log in with Facebook to link'}
                                        </p>
                                    </div>
                                </div>
                                {igAccount ? (
                                    <button onClick={handleManageSync} disabled={syncing} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Sync now
                                    </button>
                                ) : (
                                    <a href="/api/auth/facebook" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}>Reconnect</a>
                                )}
                            </div>
                            {syncMessage && (
                                <p style={{ margin: '-0.5rem 0 0 4rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{syncMessage}</p>
                            )}

                            {/* Facebook Page — real */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: `1px solid ${fbPage ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-lg)', background: fbPage ? 'rgba(16, 185, 129, 0.04)' : 'transparent' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Facebook size={32} color="#1877F2" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            Facebook Page
                                            {fbPage && <CheckCircle size={14} color="var(--accent-success)" />}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {loading ? 'Loading…' : fbPage ? `${fbPage.name} · ${(fbPage.fanCount || 0).toLocaleString()} fans` : 'No Page linked'}
                                        </p>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {fbPage ? 'Read access' : '—'}
                                </span>
                            </div>

                            {/* Meta Ads Manager — coming soon */}
                            <div style={{ ...disabledStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }} title="Direct ad publishing requires Meta Business Verification + App Review">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Facebook size={32} color="#1877F2" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            Meta Ads Manager <ComingSoonBadge />
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Direct campaign publishing — pending Meta Business Verification</p>
                                    </div>
                                </div>
                                <button disabled className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>Coming soon</button>
                            </div>

                            {/* Google Ads — coming soon */}
                            <div style={{ ...disabledStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }} title="Google Ads developer token review takes 3–10 business days">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Youtube size={32} color="#FF0000" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            Google Ads (incl. YouTube) <ComingSoonBadge />
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Google Ads API developer token approval</p>
                                    </div>
                                </div>
                                <button disabled className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>Coming soon</button>
                            </div>

                            {/* TikTok — coming soon */}
                            <div style={{ ...disabledStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }} title="TikTok For Business API app review takes 5–14 business days">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <MonitorPlay size={32} color="var(--text-primary)" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            TikTok Ads Manager <ComingSoonBadge />
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending TikTok For Business app review</p>
                                    </div>
                                </div>
                                <button disabled className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>Coming soon</button>
                            </div>
                        </div>
                    </div>

                    {/* Plan card — clarified */}
                    <div className="card shadow-lg" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Plan</h2>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You're on the free beta plan.</p>
                            </div>
                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600 }}>Free Beta</span>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>$0 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/ month</span></p>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.6 }}>
                                    All features are free while we're in beta. Bring your own LLM keys (Groq, Gemini, Anthropic) — we never charge for API usage.
                                </p>
                            </div>
                            <button disabled className="btn-secondary" title="Paid plans launching after beta" style={{ cursor: 'not-allowed', opacity: 0.55, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Lock size={14} /> Change plan
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <div className="card shadow-lg" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={18} /> Payment <ComingSoonBadge />
                        </h3>
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                            <Lock size={28} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
                            <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.95rem' }}>No payment method needed</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>You're on the free beta. We'll add Stripe + PayPal once paid plans launch — no surprise charges.</p>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <button disabled className="btn-secondary" title="Coming soon" style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', cursor: 'not-allowed', opacity: 0.55 }}>Stripe</button>
                            <button disabled className="btn-secondary" title="Coming soon" style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', cursor: 'not-allowed', opacity: 0.55 }}>PayPal</button>
                        </div>
                    </div>

                    <div className="card shadow-lg" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={18} /> Account
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                                <span style={{ fontWeight: 500 }}>{user?.name || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                                <span style={{ fontWeight: 500 }}>{user?.email || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Member since</span>
                                <span style={{ fontWeight: 500 }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-lg" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={18} /> Invoice History
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No invoices — you're on the free beta.</p>
                    </div>

                </div>
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}

export default Billing
