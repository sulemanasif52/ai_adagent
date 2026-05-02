import React, { useEffect, useMemo, useState } from 'react'
import { Eye, MousePointerClick, ShoppingCart, TrendingUp, RefreshCw, Loader2, Instagram, AlertTriangle, MessageCircle, Users, Clock, BarChart3, ArrowDown, ArrowUp, Smile, Frown, Meh, HelpCircle, Facebook } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import StatCard from '../components/StatCard'
import {
    getIgAccount, getIgInsights, getIgPosts, getIgPostComments, syncInstagram,
    getFbPage, getFbPageInsights, getFbPagePosts,
    listRecommendations, mlAudienceClusters, mlRunAll, mlSentiment,
} from '../lib/server'

const fmt = n => (n == null ? '—' : Number(n).toLocaleString())
const fmtPct = n => (n == null ? '—' : `${n > 0 ? '+' : ''}${(n * 100).toFixed(0)}%`)
const dayLabel = iso => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function sumSeries(series) {
    return (series || []).reduce((s, p) => s + (Number(p.value) || 0), 0)
}

const TABS = [
    { id: 'overview', label: 'Instagram', icon: Instagram },
    { id: 'fb',       label: 'Facebook Page', icon: Facebook },
    { id: 'comments', label: 'Comments + Sentiment', icon: MessageCircle },
    { id: 'audience', label: 'Audience Clusters', icon: Users },
    { id: 'besttime', label: 'Best Times', icon: Clock },
]

export default function Analytics() {
    const [tab, setTab] = useState('overview')
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
                getIgPosts({ limit: 12 }),
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

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', padding: '3rem 0' }}>
                <Loader2 size={18} className="spin" /> Loading analytics…
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
                    <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem' }}>Analytics</h1>
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

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                {TABS.map(t => {
                    const Icon = t.icon
                    const active = tab === t.id
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1rem', border: 'none',
                            background: 'transparent',
                            color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: `2px solid ${active ? 'var(--accent-primary)' : 'transparent'}`,
                            cursor: 'pointer', fontSize: '0.9rem', fontWeight: active ? 600 : 500,
                            whiteSpace: 'nowrap',
                        }}>
                            <Icon size={16} /> {t.label}
                        </button>
                    )
                })}
            </div>

            {tab === 'overview' && <OverviewTab account={account} insights={insights} posts={posts} days={days} />}
            {tab === 'fb'       && <FacebookTab days={days} />}
            {tab === 'comments' && <CommentsTab posts={posts} />}
            {tab === 'audience' && <AudienceTab />}
            {tab === 'besttime' && <BestTimeTab />}

            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ account, insights, posts, days }) {
    const reachSeries = insights?.series?.reach || []
    const totals = insights?.totals || {}
    const totalReach = sumSeries(reachSeries)
    const totalViews = totals.views ?? 0
    const totalProfileViews = totals.profile_views ?? 0
    const totalWebsiteClicks = totals.website_clicks ?? 0
    const totalEngaged = totals.accounts_engaged ?? 0

    // Compute period-over-period trend from the reach time-series.
    const trendReach = useMemo(() => periodTrend(reachSeries), [reachSeries])

    const chartData = useMemo(() =>
        reachSeries.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(r => ({
            date: r.date, reach: r.value || 0, day: dayLabel(r.date),
        })), [reachSeries])

    const engagementData = useMemo(() =>
        posts.slice(0, 10).reverse().map(p => ({
            date: new Date(p.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            likes: p.likeCount || 0,
            comments: p.commentsCount || 0,
        })), [posts])

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title={`Reach (${days}d)`} value={fmt(totalReach)} trend={trendReach > 0 ? 'up' : 'down'} trendValue={fmtPct(trendReach)} icon={Eye} />
                <StatCard title={`Views (${days}d)`} value={fmt(totalViews)} trend="up" trendValue="—" icon={TrendingUp} />
                <StatCard title={`Profile Views (${days}d)`} value={fmt(totalProfileViews)} trend="up" trendValue="—" icon={MousePointerClick} />
                <StatCard title="Followers" value={fmt(account?.followers)} trend="up" trendValue="—" icon={Instagram} />
                <StatCard title={`Accounts Engaged (${days}d)`} value={fmt(totalEngaged)} trend="up" trendValue="—" icon={Users} />
                <StatCard title={`Website Clicks (${days}d)`} value={fmt(totalWebsiteClicks)} trend="up" trendValue="—" icon={ShoppingCart} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <ChartCard title={`Daily reach — last ${days} days`} empty={chartData.length === 0 ? 'No insights yet — try Sync now.' : null}>
                    <ResponsiveContainer width="100%" height={280}>
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
                </ChartCard>

                <ChartCard title="Recent post engagement" empty={engagementData.length === 0 ? 'Sync to see post engagement.' : null}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={engagementData}>
                            <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} />
                            <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                            <Bar dataKey="likes" fill="#A78BFA" name="Likes" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="comments" fill="#38BDF8" name="Comments" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Recent posts</h3>
                {posts.length === 0 ? (
                    <Empty msg="No posts cached. Click Sync now to fetch from Instagram." />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                        {posts.map(p => (
                            <a key={p.id} href={p.permalink || '#'} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                    {(p.thumbnailUrl || p.mediaUrl) ? (
                                        <img src={p.thumbnailUrl || p.mediaUrl} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><Instagram size={32} /></div>
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
        </div>
    )
}

// ─── Facebook Page Tab ────────────────────────────────────────────────────────

function FacebookTab({ days }) {
    const [page, setPage] = useState(null)
    const [insights, setInsights] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setLoading(true); setError(null)
        Promise.all([getFbPage(), getFbPageInsights(days), getFbPagePosts(8)])
            .then(([p, ins, ps]) => { setPage(p); setInsights(ins); setPosts(ps.posts || []) })
            .catch(setError)
            .finally(() => setLoading(false))
    }, [days])

    if (loading) return <Loading />
    if (error) return <Empty msg={error.message || 'Could not load Facebook Page data.'} />
    if (!page) return <Empty msg="No Facebook Page connected." />

    const series = insights?.series || {}
    const totals = insights?.totals || {}
    const reachData = (series.page_impressions_unique || []).map(p => ({ day: dayLabel(p.date), reach: p.value }))

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                {page.avatar && <img src={page.avatar} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />}
                <div>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{page.name}</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{fmt(page.fanCount)} fans · {fmt(page.followers)} followers · {page.category || ''}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title={`Page Impressions (${days}d)`} value={fmt(totals.page_impressions)} trend="up" trendValue="—" icon={Eye} />
                <StatCard title={`Unique Reach (${days}d)`} value={fmt(totals.page_impressions_unique)} trend="up" trendValue="—" icon={Users} />
                <StatCard title={`Post Engagements (${days}d)`} value={fmt(totals.page_post_engagements)} trend="up" trendValue="—" icon={MousePointerClick} />
                <StatCard title={`Video Views (${days}d)`} value={fmt(totals.page_video_views)} trend="up" trendValue="—" icon={TrendingUp} />
            </div>

            {reachData.length > 0 && (
                <ChartCard title={`Daily unique reach — last ${days} days`}>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={reachData}>
                            <defs>
                                <linearGradient id="fbReach" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#1877F2" stopOpacity={0.5} />
                                    <stop offset="100%" stopColor="#1877F2" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} />
                            <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                            <Area type="monotone" dataKey="reach" stroke="#1877F2" fill="url(#fbReach)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}

            <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Recent Page posts</h3>
                {posts.length === 0 ? <Empty msg="No recent posts." /> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {posts.map(p => (
                            <a key={p.id} href={p.permalink || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                                    {p.image ? <img src={p.image} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 80, height: 80, background: 'var(--bg-tertiary)', borderRadius: 8 }} />}
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.message || '(no caption)'}</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{new Date(p.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>👍 {fmt(p.reactions)}</span>
                                        <span>💬 {fmt(p.comments)}</span>
                                        <span>🔁 {fmt(p.shares)}</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────

function CommentsTab({ posts }) {
    const [data, setData] = useState({})  // postId → comments | { error }
    const [loadingId, setLoadingId] = useState(null)
    const [autoLoading, setAutoLoading] = useState(true)
    const [classifying, setClassifying] = useState(false)
    const [classifyMsg, setClassifyMsg] = useState('')

    // Pre-load comments for ALL visible posts on mount.
    useEffect(() => {
        let cancelled = false
        const targets = posts.filter(p => p.commentsCount > 0).slice(0, 10)
        if (!targets.length) {
            setAutoLoading(false)
            return
        }
        ;(async () => {
            for (const p of targets) {
                if (cancelled) break
                try {
                    const r = await getIgPostComments(p.id, true)
                    if (cancelled) break
                    setData(prev => ({ ...prev, [p.id]: r.comments || [] }))
                } catch (err) {
                    if (cancelled) break
                    setData(prev => ({ ...prev, [p.id]: { error: err.message } }))
                }
            }
            if (!cancelled) setAutoLoading(false)
        })()
        return () => { cancelled = true }
    }, [posts])

    const runClassify = async () => {
        setClassifying(true)
        setClassifyMsg('')
        try {
            const r = await mlSentiment()
            setClassifyMsg(`Classified ${r.classified || 0} comments`)
            // Refetch comments so the analysis shows up.
            const targets = posts.filter(p => p.commentsCount > 0).slice(0, 10)
            for (const p of targets) {
                try {
                    const r2 = await getIgPostComments(p.id, true)
                    setData(prev => ({ ...prev, [p.id]: r2.comments || [] }))
                } catch {}
            }
        } catch (err) {
            setClassifyMsg(`Classification failed: ${err.message}`)
        } finally {
            setClassifying(false)
        }
    }

    const loadComments = async (postId) => {
        setLoadingId(postId)
        try {
            const r = await getIgPostComments(postId, true)
            setData(prev => ({ ...prev, [postId]: r.comments || [] }))
        } catch (err) {
            setData(prev => ({ ...prev, [postId]: { error: err.message } }))
        } finally {
            setLoadingId(null)
        }
    }

    // Aggregate sentiment across all loaded comments
    const allLoaded = Object.values(data).filter(v => Array.isArray(v)).flat()
    const sentimentCounts = useMemo(() => {
        const counts = { positive: 0, neutral: 0, negative: 0, question: 0, unknown: 0 }
        for (const c of allLoaded) {
            const s = c.analysis?.sentiment || 'unknown'
            counts[s] = (counts[s] || 0) + 1
        }
        return counts
    }, [allLoaded])

    const pieData = Object.entries(sentimentCounts)
        .filter(([_, n]) => n > 0)
        .map(([name, value]) => ({ name, value }))

    const COLORS = { positive: '#10B981', neutral: '#94A3B8', negative: '#EF4444', question: '#A78BFA', unknown: '#475569' }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                    {autoLoading ? 'Loading comments…' : 'Comments auto-classified by Groq + hourly cron.'}
                </p>
                <button onClick={runClassify} disabled={classifying} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                    {classifying ? <Loader2 size={14} className="spin" /> : <Smile size={14} />} {classifying ? 'Classifying…' : 'Re-run sentiment'}
                </button>
            </div>
            {classifyMsg && <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{classifyMsg}</p>}

            {pieData.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Sentiment across loaded comments</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                        {pieData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#475569'} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                                { k: 'positive', icon: Smile, color: COLORS.positive },
                                { k: 'neutral', icon: Meh, color: COLORS.neutral },
                                { k: 'negative', icon: Frown, color: COLORS.negative },
                                { k: 'question', icon: HelpCircle, color: COLORS.question },
                            ].map(s => {
                                const Icon = s.icon
                                return (
                                    <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={14} /></div>
                                        <span style={{ flex: 1, textTransform: 'capitalize', fontSize: '0.875rem' }}>{s.k}</span>
                                        <strong>{sentimentCounts[s.k] || 0}</strong>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {posts.map(p => {
                    const comments = data[p.id]
                    const isLoading = loadingId === p.id
                    return (
                        <div key={p.id} className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {(p.thumbnailUrl || p.mediaUrl) ? <img src={p.thumbnailUrl || p.mediaUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 56, height: 56, background: 'var(--bg-tertiary)', borderRadius: 8 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.caption || '(no caption)'}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.commentsCount || 0} comments · {new Date(p.timestamp).toLocaleDateString()}</p>
                                </div>
                                <button className="btn-secondary" onClick={() => loadComments(p.id)} disabled={isLoading} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                    {isLoading ? <Loader2 size={14} className="spin" /> : (comments ? 'Reload' : 'Load comments')}
                                </button>
                            </div>

                            {Array.isArray(comments) && comments.length > 0 && (
                                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {comments.slice(0, 10).map(c => (
                                        <div key={c.id} style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                            <SentimentDot sentiment={c.analysis?.sentiment} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>@{c.username || 'anon'}</span>
                                                <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>{c.text}</span>
                                            </div>
                                            {c.analysis?.intent && (
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', textTransform: 'capitalize' }}>{c.analysis.intent}</span>
                                            )}
                                        </div>
                                    ))}
                                    {comments.length === 0 && <Empty msg="No comments on this post." />}
                                </div>
                            )}
                            {comments?.error && <p style={{ margin: '0.5rem 0 0', color: '#fca5a5', fontSize: '0.8rem' }}>{comments.error}</p>}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function SentimentDot({ sentiment }) {
    const colors = { positive: '#10B981', neutral: '#94A3B8', negative: '#EF4444', question: '#A78BFA' }
    const c = colors[sentiment] || '#475569'
    return <div title={sentiment || 'unknown'} style={{ width: 8, height: 8, marginTop: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
}

// ─── Audience Tab ─────────────────────────────────────────────────────────────

function AudienceTab() {
    const [k, setK] = useState(3)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        mlAudienceClusters(k).then(setData).catch(err => setData({ error: err.message })).finally(() => setLoading(false))
    }, [k])

    if (loading) return <Loading />
    if (data?.error) return <Empty msg={data.error} />
    if (data?.skipped === 'not_enough_posts') return <Empty msg="Not enough posts to cluster yet — sync more posts first." />
    if (!data?.clusters?.length) return <Empty msg="No clusters available." />

    const COLORS = ['#38BDF8', '#A78BFA', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
    const pieData = data.clusters.map((c, i) => ({ name: `Segment ${i + 1}`, value: c.size }))

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>K-means clustering of your posts by engagement profile.</p>
                <select value={k} onChange={e => setK(Number(e.target.value))} className="input-base" style={{ width: 'auto' }}>
                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} segments</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: '1.5rem' }}>
                <ChartCard title="Segment sizes">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.clusters.map((c, i) => (
                        <div key={c.id} className="card" style={{ padding: '1rem', borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Segment {i + 1}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.size} posts</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                                <span>Avg likes: <strong>{c.avgLikes}</strong></span>
                                <span>Avg comments: <strong>{c.avgComments}</strong></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Best Times Tab ───────────────────────────────────────────────────────────

function BestTimeTab() {
    const [rec, setRec] = useState(null)
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)
    const [error, setError] = useState(null)

    const load = async () => {
        setLoading(true); setError(null)
        try {
            const r = await listRecommendations({ type: 'besttime', active: '1' })
            setRec(r.recommendations?.[0] || null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const runAnalysis = async () => {
        setRunning(true)
        try {
            await mlRunAll()
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setRunning(false)
        }
    }

    if (loading) return <Loading />

    const matrix = rec?.data?.matrix
    const top = rec?.data?.top

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Engagement heatmap by day-of-week × hour-of-day. Computed nightly via ML cron.</p>
                <button className="btn-secondary" onClick={runAnalysis} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    {running ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {running ? 'Running…' : 'Run ML now'}
                </button>
            </div>

            {error && <Empty msg={error} />}

            {!matrix && !error && (
                <Empty msg="No best-time data yet. Click 'Run ML now' (needs at least 10 posts cached)." />
            )}

            {matrix && (
                <>
                    {top?.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            {top.slice(0, 3).map((t, i) => {
                                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                                return (
                                    <div key={i} className="card" style={{ padding: '1rem', borderLeft: `3px solid ${i === 0 ? '#10B981' : 'var(--accent-primary)'}` }}>
                                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>#{i + 1} best window</p>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>{days[t.day]} · {String(t.hour).padStart(2, '0')}:00</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg engagement: <strong>{t.avg.toFixed(1)}</strong> ({t.count} posts)</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <Heatmap matrix={matrix} />
                </>
            )}
        </div>
    )
}

function Heatmap({ matrix }) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const max = Math.max(...matrix.flat(), 1)

    return (
        <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '0.25rem 0.5rem', textAlign: 'right', color: 'var(--text-tertiary)' }}></th>
                        {Array.from({ length: 24 }).map((_, h) => (
                            <th key={h} style={{ padding: '0.25rem 0.15rem', textAlign: 'center', color: 'var(--text-tertiary)', fontWeight: 500, width: 24 }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix.map((row, dIdx) => (
                        <tr key={dIdx}>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>{days[dIdx]}</td>
                            {row.map((v, hIdx) => {
                                const intensity = v / max
                                const bg = `rgba(56, 189, 248, ${0.05 + intensity * 0.85})`
                                return (
                                    <td key={hIdx} title={`${days[dIdx]} ${hIdx}:00 — ${v.toFixed(1)} avg engagement`} style={{
                                        width: 24, height: 24, background: bg,
                                        border: '1px solid var(--bg-primary)',
                                        textAlign: 'center', color: intensity > 0.5 ? 'white' : 'transparent', fontSize: '0.65rem',
                                    }}>
                                        {intensity > 0.7 ? Math.round(v) : ''}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodTrend(series) {
    if (!series || series.length < 4) return null
    const half = Math.floor(series.length / 2)
    const a = series.slice(0, half).reduce((s, p) => s + (p.value || 0), 0)
    const b = series.slice(half).reduce((s, p) => s + (p.value || 0), 0)
    if (!a) return null
    return (b - a) / a
}

function ChartCard({ title, empty, children }) {
    return (
        <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{title}</h3>
            {empty ? <Empty msg={empty} /> : children}
        </div>
    )
}

function Empty({ msg }) {
    return <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>{msg}</div>
}

function Loading() {
    return <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', padding: '2rem 0' }}><Loader2 size={16} className="spin" /> Loading…</div>
}

function NotConnected({ error, onRetry }) {
    const isNotConnected = error?.status === 412
    return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 560, margin: '2rem auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', marginBottom: '1rem' }}>
                {isNotConnected ? <Instagram size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{isNotConnected ? 'Connect your Instagram' : "Couldn't load analytics"}</h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {isNotConnected ? "Your Facebook account doesn't yet have a Facebook Page with an Instagram Business account linked. Switch your IG to Business or Creator, link it to a Page, then log in again." : (error?.message || 'Something went wrong fetching from the Instagram Graph API.')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn-primary" onClick={onRetry}>Retry</button>
                {isNotConnected && (
                    <a href="/api/auth/facebook" className="btn-primary" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Reconnect Facebook</a>
                )}
            </div>
        </div>
    )
}
