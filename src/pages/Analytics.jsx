import React, { useEffect, useMemo, useState } from 'react'
import { Eye, MousePointerClick, ShoppingCart, TrendingUp, RefreshCw, Loader2, Instagram, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../components/StatCard'
import { getIgAccount, getIgInsights, getIgPosts, syncInstagram } from '../lib/server'

const fmt = n => (n == null ? '—' : Number(n).toLocaleString())
const dayLabel = iso => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function sumSeries(series) {
    return (series || []).reduce((s, p) => s + (Number(p.value) || 0), 0)
}

export default function Analytics() {
    const [account, setAccount] = useState(null)
    const [insights, setInsights] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState(null)
    const [days, setDays] = useState(7)

    const load = async () => {
        setError(null)
        try {
            const [a, ins, ps] = await Promise.all([
                getIgAccount(),
                getIgInsights(days),
                getIgPosts({ limit: 6 }),
            ])
            setAccount(a)
            setInsights(ins)
            setPosts(ps.posts || [])
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSync = async () => {
        setSyncing(true)
        try {
            await syncInstagram()
            await load()
        } catch (err) {
            setError(err)
        } finally {
            setSyncing(false)
        }
    }

    const reachSeries = insights?.series?.reach || []
    const totals = insights?.totals || {}

    const totalReach = sumSeries(reachSeries)
    const totalViews = totals.views ?? 0
    const totalProfileViews = totals.profile_views ?? 0
    const totalWebsiteClicks = totals.website_clicks ?? 0

    // v21 only gives `reach` as a true time-series; the chart shows reach.
    const chartData = useMemo(() => {
        return reachSeries
            .slice()
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map(r => ({ date: r.date, reach: r.value || 0, day: dayLabel(r.date) }))
    }, [insights]) // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', padding: '3rem 0' }}>
                <Loader2 size={18} className="spin" /> Loading Instagram analytics…
                <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        )
    }

    if (error) {
        return <NotConnected error={error} onRetry={load} />
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem' }}>Instagram Analytics</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {account?.username ? <>@{account.username} · {fmt(account.followers)} followers · {fmt(account.mediaCount)} posts</> : 'Loading…'}
                        {account?.lastSyncedAt && <> · <span style={{ color: 'var(--text-tertiary)' }}>last synced {new Date(account.lastSyncedAt).toLocaleString()}</span></>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-base" style={{ width: 'auto' }}>
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                    </select>
                    <button className="btn-primary" onClick={handleSync} disabled={syncing} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        {syncing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                        {syncing ? 'Syncing…' : 'Sync now'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title={`Reach (${days}d)`} value={fmt(totalReach)} trend="up" trendValue="—" icon={Eye} />
                <StatCard title={`Views (${days}d)`} value={fmt(totalViews)} trend="up" trendValue="—" icon={TrendingUp} />
                <StatCard title={`Profile Views (${days}d)`} value={fmt(totalProfileViews)} trend="up" trendValue="—" icon={MousePointerClick} />
                <StatCard title="Followers" value={fmt(account?.followers)} trend="up" trendValue="—" icon={Instagram} />
                <StatCard title={`Website Clicks (${days}d)`} value={fmt(totalWebsiteClicks)} trend="up" trendValue="—" icon={ShoppingCart} />
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Daily reach — last {days} days</h3>
                {chartData.length === 0 ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '2rem 0' }}>
                        No insights data yet. Try clicking <strong>Sync now</strong>.
                    </div>
                ) : (
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="aReach" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} />
                                <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                                <Area type="monotone" dataKey="reach" stroke="#38BDF8" fill="url(#aReach)" strokeWidth={2} name="Reach" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Recent posts</h3>
                {posts.length === 0 ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '1rem 0' }}>
                        No posts cached. Click <strong>Sync now</strong> to fetch from Instagram.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                        {posts.map(p => (
                            <a key={p.id} href={p.permalink || '#'} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                    {(p.thumbnailUrl || p.mediaUrl) ? (
                                        <img src={p.thumbnailUrl || p.mediaUrl} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                                            <Instagram size={32} />
                                        </div>
                                    )}
                                    <div style={{ padding: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{new Date(p.timestamp).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '0.75rem' }}>
                                            <span>♥ {fmt(p.likeCount)}</span>
                                            <span>💬 {fmt(p.commentsCount)}</span>
                                        </div>
                                        {p.caption && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.caption}</div>}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}

function NotConnected({ error, onRetry }) {
    const isNotConnected = error?.status === 412
    return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 560, margin: '2rem auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', marginBottom: '1rem' }}>
                {isNotConnected ? <Instagram size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
                {isNotConnected ? 'Connect your Instagram' : "Couldn't load analytics"}
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {isNotConnected
                    ? "Your Facebook account doesn't yet have a Facebook Page with an Instagram Business account linked. Switch your IG to Business or Creator, link it to a Page, then log in again."
                    : (error?.message || 'Something went wrong fetching from the Instagram Graph API.')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn-primary" onClick={onRetry}>Retry</button>
                {isNotConnected && (
                    <a href="/api/auth/facebook" className="btn-primary" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                        Reconnect Facebook
                    </a>
                )}
            </div>
        </div>
    )
}
