import React, { useState } from 'react'
import { Search, TrendingUp, MessageSquare, Globe, Newspaper, Sparkles, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { trendsAdLibrary, trendsReddit, trendsNews, trendsHN, trendsSynthesize } from '../lib/server'

const PANELS = [
    { id: 'adlib',  label: 'Competitor Ads (Meta)', icon: Globe },
    { id: 'reddit', label: 'Hot in Reddit',         icon: MessageSquare },
    { id: 'news',   label: 'In the News',           icon: Newspaper },
    { id: 'hn',     label: 'On Hacker News',        icon: TrendingUp },
]

const Trends = () => {
    const [keyword, setKeyword] = useState('fitness')
    const [subreddit, setSubreddit] = useState('marketing')
    const [results, setResults] = useState({ adlib: null, reddit: null, news: null, hn: null })
    const [loading, setLoading] = useState({})
    const [errors, setErrors] = useState({})
    const [synthesis, setSynthesis] = useState(null)
    const [synthLoading, setSynthLoading] = useState(false)

    const setLoad = (id, v) => setLoading(prev => ({ ...prev, [id]: v }))
    const setErr = (id, v) => setErrors(prev => ({ ...prev, [id]: v }))

    const fetchAll = async (fresh = false) => {
        setSynthesis(null)

        const tasks = [
            ['adlib', () => trendsAdLibrary(keyword, 'US', fresh)],
            ['reddit', () => trendsReddit(subreddit, 10, 'day', fresh)],
            ['news',  () => trendsNews(keyword, 10, fresh)],
            ['hn',    () => trendsHN(10, fresh)],
        ]
        await Promise.all(tasks.map(async ([id, fn]) => {
            setLoad(id, true)
            setErr(id, null)
            try {
                const r = await fn()
                setResults(prev => ({ ...prev, [id]: r }))
            } catch (err) {
                setErr(id, err.message || 'Failed')
            } finally {
                setLoad(id, false)
            }
        }))
    }

    const synthesize = async () => {
        setSynthLoading(true)
        try {
            const adsForSynth = (results.adlib?.data?.ads || []).slice(0, 8).map(a => ({
                page: a.page_name,
                text: (a.ad_creative_bodies || [])[0],
            }))
            const redditForSynth = (results.reddit?.data?.posts || []).slice(0, 8).map(p => ({ title: p.title, score: p.score }))
            const newsForSynth = (results.news?.data?.articles || []).slice(0, 8).map(n => ({ title: n.title, source: n.source }))
            const out = await trendsSynthesize(keyword, { adLibrary: adsForSynth, reddit: redditForSynth, news: newsForSynth })
            setSynthesis(out)
        } catch (err) {
            setSynthesis({ error: err.message })
        } finally {
            setSynthLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Market Pulse</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Live signal from competitor ads, social, news, and search — synthesized into ad angles you can ship.</p>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Industry / keyword</label>
                    <input className="input-base" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. fitness, skincare, fintech" style={{ background: 'var(--bg-secondary)' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Subreddit</label>
                    <input className="input-base" value={subreddit} onChange={e => setSubreddit(e.target.value)} placeholder="e.g. Entrepreneur" style={{ background: 'var(--bg-secondary)' }} />
                </div>
                <button onClick={() => fetchAll(false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                    <Search size={16} /> Pull signal
                </button>
                <button onClick={() => fetchAll(true)} title="Bypass cache and re-fetch from sources" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}>
                    <RefreshCw size={14} /> Refresh
                </button>
                <button onClick={synthesize} disabled={synthLoading || !Object.values(results).some(r => r)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                    {synthLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Synthesize
                </button>
            </div>

            {synthesis && (
                <div className="card" style={{ padding: '1.5rem', borderLeft: '3px solid #A78BFA' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem' }}>
                        <Sparkles size={20} color="#A78BFA" /> AI Synthesis
                    </h3>
                    {synthesis.error ? (
                        <p style={{ color: '#fca5a5', margin: 0 }}>{synthesis.error}</p>
                    ) : (
                        <>
                            <p style={{ marginTop: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>{synthesis.summary}</p>
                            {synthesis.themes?.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    {synthesis.themes.map((t, i) => (
                                        <span key={i} style={{ padding: '0.3rem 0.75rem', background: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>{t}</span>
                                    ))}
                                </div>
                            )}
                            {synthesis.suggestedAngles?.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                    {synthesis.suggestedAngles.map((a, i) => (
                                        <div key={i} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                            <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.95rem' }}>{a.headline}</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.rationale}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
                {PANELS.map(panel => (
                    <Panel
                        key={panel.id}
                        title={panel.label}
                        icon={panel.icon}
                        loading={loading[panel.id]}
                        error={errors[panel.id]}
                        data={results[panel.id]?.data}
                        kind={panel.id}
                    />
                ))}
            </div>

            <style>{`.spin { animation: spin 1s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}

const Panel = ({ title, icon: Icon, loading, error, data, kind }) => {
    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)' }}>
                <Icon size={16} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{title}</h3>
            </div>
            <div style={{ padding: '1rem 1.25rem', maxHeight: '420px', overflowY: 'auto' }}>
                {loading && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', padding: '1rem 0' }}><Loader2 size={14} className="spin" /> Loading…</div>}
                {error && <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>}
                {!loading && !error && !data && <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Click "Pull signal" to populate.</p>}
                {data && <PanelBody kind={kind} data={data} />}
            </div>
        </div>
    )
}

const PanelBody = ({ kind, data }) => {
    if (kind === 'adlib') {
        const ads = data?.ads || []
        if (!ads.length) return <Empty msg={data?.error || 'No ads found for this keyword.'} />
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ads.slice(0, 12).map(a => (
                    <a key={a.id} href={a.ad_snapshot_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{a.page_name}</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{(a.ad_creative_bodies || [])[0] || (a.ad_creative_link_titles || [])[0] || '(no creative text)'}</p>
                        </div>
                    </a>
                ))}
            </div>
        )
    }
    if (kind === 'reddit') {
        const posts = data?.posts || []
        if (!posts.length) return <Empty msg={data?.error || 'No posts found.'} />
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {posts.map(p => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>{p.title}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>r/{p.subreddit} · ↑ {p.score} · 💬 {p.comments}</p>
                        </div>
                    </a>
                ))}
            </div>
        )
    }
    if (kind === 'news') {
        const articles = data?.articles || []
        if (!articles.length) return <Empty msg={data?.error || 'Add a NewsAPI key in Settings to enable.'} />
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {articles.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>{a.title}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{a.source} · {new Date(a.publishedAt).toLocaleDateString()}</p>
                        </div>
                    </a>
                ))}
            </div>
        )
    }
    if (kind === 'hn') {
        const stories = data?.stories || []
        if (!stories.length) return <Empty msg={data?.error || 'Nothing right now.'} />
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stories.map(s => (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>{s.title}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>↑ {s.score} · 💬 {s.comments} · {s.by}</p>
                        </div>
                    </a>
                ))}
            </div>
        )
    }
    return null
}

const Empty = ({ msg }) => <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{msg}</p>

export default Trends
