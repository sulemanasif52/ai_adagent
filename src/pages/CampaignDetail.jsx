import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Instagram, Facebook, Send, ExternalLink, Trash2, AlertTriangle, CheckCircle, Image as ImageIcon, DollarSign, MousePointerClick, Users, TrendingUp, Plus, Sparkles } from 'lucide-react'
import { getCampaign, publishCampaign, deleteCampaign, listCampaignPosts, createCampaignPost, deleteCampaignPost, publishCampaignPost, aiAnalyze, aiGenerateImage } from '../lib/server'

const fmtMoney = (n) => n == null ? '—' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtPct = (n) => n == null ? '—' : `${(n * 100).toFixed(0)}%`

const STATUS_COLOR = {
    draft:    { bg: 'rgba(100,116,139,0.15)', fg: '#94A3B8' },
    active:   { bg: 'rgba(16,185,129,0.15)',  fg: '#10B981' },
    paused:   { bg: 'rgba(245,158,11,0.15)',  fg: '#F59E0B' },
    archived: { bg: 'rgba(100,116,139,0.15)', fg: '#64748B' },
}

export default function CampaignDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [publishing, setPublishing] = useState(false)
    const [publishResults, setPublishResults] = useState(null)
    const [selectedPlatforms, setSelectedPlatforms] = useState({ instagram: true, facebook: true })

    // Posts (multiple ad creatives per campaign)
    const [posts, setPosts] = useState([])
    const [postsLoading, setPostsLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [showCreator, setShowCreator] = useState(false)
    const [newPostDescription, setNewPostDescription] = useState('')

    const load = () => {
        setLoading(true)
        getCampaign(id)
            .then(r => {
                setData(r)
                const platforms = r.campaign.platforms || []
                setSelectedPlatforms({
                    instagram: platforms.includes('instagram'),
                    facebook: platforms.includes('facebook'),
                })
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }

    const loadPosts = () => {
        setPostsLoading(true)
        listCampaignPosts(id)
            .then(r => setPosts(r.posts || []))
            .catch(() => {})
            .finally(() => setPostsLoading(false))
    }

    useEffect(() => { load(); loadPosts() }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreatePost = async () => {
        if (!newPostDescription.trim()) return
        setCreating(true)
        try {
            // Use AI to generate copy + image, then save as a CampaignPost.
            const analysis = await aiAnalyze({ description: newPostDescription, productName: data?.campaign?.product || data?.campaign?.name })
            const imgPromise = analysis.imagePrompt ? aiGenerateImage({ prompt: analysis.imagePrompt }) : Promise.resolve(null)
            const img = await imgPromise.catch(() => null)
            await createCampaignPost(id, {
                imageUrl: img?.url || null,
                headline: analysis.copy?.headlines?.[0] || null,
                body: analysis.copy?.body || null,
                cta: analysis.copy?.cta || null,
            })
            setNewPostDescription('')
            setShowCreator(false)
            loadPosts()
        } catch (err) {
            alert('Failed to generate post: ' + err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleDeletePost = async (postId) => {
        if (!confirm('Delete this ad?')) return
        await deleteCampaignPost(postId).catch(() => {})
        loadPosts()
    }

    const handlePublishPost = async (postId, platforms) => {
        try {
            await publishCampaignPost(postId, { platforms })
            loadPosts()
        } catch (err) {
            alert('Publish failed: ' + err.message)
        }
    }

    const handlePublish = async () => {
        const platforms = Object.entries(selectedPlatforms).filter(([_, v]) => v).map(([k]) => k)
        if (platforms.length === 0) {
            setPublishResults({ ok: false, results: [{ platform: '—', ok: false, error: 'Pick at least one platform' }] })
            return
        }
        setPublishing(true)
        setPublishResults(null)
        try {
            const r = await publishCampaign(id, { platforms })
            setPublishResults(r)
            // Refresh after publish in case status changed.
            await load()
        } catch (err) {
            setPublishResults({ ok: false, results: [{ platform: 'all', ok: false, error: err.message }] })
        } finally {
            setPublishing(false)
        }
    }

    const handleArchive = async () => {
        if (!confirm('Archive this campaign? It will be hidden but metrics retained.')) return
        try {
            await deleteCampaign(id)
            navigate('/dashboard')
        } catch (err) {
            alert('Archive failed: ' + err.message)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', padding: '3rem 0' }}>
                <Loader2 size={18} className="spin" /> Loading campaign…
                <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 480, margin: '2rem auto' }}>
                <AlertTriangle size={32} color="var(--accent-warning)" style={{ marginBottom: '0.75rem' }} />
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Couldn't load campaign</h2>
                <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{error || 'Not found'}</p>
                <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
            </div>
        )
    }

    const { campaign, summary } = data
    const images = campaign.imageUrls || []
    const copy = campaign.copy || {}
    const targeting = campaign.targeting || {}
    const status = STATUS_COLOR[campaign.status] || STATUS_COLOR.draft

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem' }}>
                        <ArrowLeft size={14} /> Back
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{campaign.name}</h1>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: status.bg, color: status.fg, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{campaign.status}</span>
                </div>
                <button onClick={handleArchive} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#EF4444' }}>
                    <Trash2 size={14} /> Archive
                </button>
            </div>

            {/* Summary tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <Tile icon={DollarSign}        label="Total Spend"     value={fmtMoney(summary?.spend)} color="#38BDF8" />
                <Tile icon={Users}             label="Leads Captured"  value={summary?.leads ?? 0} color="#A78BFA" />
                <Tile icon={MousePointerClick} label="CTR"             value={summary?.ctr != null ? fmtPct(summary.ctr) : '—'} color="#10B981" />
                <Tile icon={TrendingUp}        label="ROI"             value={summary?.roi != null ? fmtPct(summary.roi) : '—'} color={summary?.roi > 0 ? '#10B981' : '#94A3B8'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                {/* Left: creative + copy */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Creative</h3>
                    {images.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                            {images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)' }}>
                            <ImageIcon size={32} style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No image attached. Edit campaign to add one.</p>
                        </div>
                    )}

                    {(copy.headlines?.length > 0 || copy.body || copy.cta) && (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>Copy</h4>
                            {copy.headlines?.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {copy.headlines.map((h, i) => <p key={i} style={{ margin: '0 0 0.2rem', fontWeight: 600, fontSize: '0.95rem' }}>{i === 0 ? '🎯 ' : ''}{h}</p>)}
                                </div>
                            )}
                            {copy.body && <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{copy.body}</p>}
                            {copy.cta && <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>CTA:</strong> {copy.cta}</p>}
                        </div>
                    )}

                    {campaign.videoUrl && (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>Video / voiceover</h4>
                            <audio controls src={campaign.videoUrl} style={{ width: '100%' }} />
                        </div>
                    )}
                </div>

                {/* Right: settings + publish */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Settings</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                            <Row k="Product" v={campaign.product || campaign.name} />
                            <Row k="Daily budget" v={fmtMoney(campaign.dailyBudget)} />
                            <Row k="Lifetime cap" v={fmtMoney(campaign.lifetimeCap)} />
                            <Row k="Estimated revenue / lead" v={fmtMoney(campaign.estRevenue)} />
                            <Row k="Created" v={new Date(campaign.createdAt).toLocaleDateString()} />
                            {targeting?.location && (
                                <Row k="Targeting" v={targeting.location.mode === 'ai' ? 'AI optimized' : `${targeting.location.target} (+${targeting.location.radiusMiles}mi)`} />
                            )}
                        </div>
                        {campaign.description && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>Description</p>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{campaign.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Publish to networks */}
                    <div className="card" style={{ padding: '1.5rem', borderTop: '3px solid #A78BFA' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Send size={16} color="#A78BFA" /> Publish to networks
                        </h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Posts an organic post to your linked Page/IG. Requires <code>pages_manage_posts</code> and <code>instagram_content_publish</code> permissions.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            <PlatformToggle
                                icon={<Instagram size={18} color="#E1306C" />}
                                label="Instagram (image post)"
                                checked={selectedPlatforms.instagram}
                                onChange={() => setSelectedPlatforms(p => ({ ...p, instagram: !p.instagram }))}
                            />
                            <PlatformToggle
                                icon={<Facebook size={18} color="#1877F2" />}
                                label="Facebook Page"
                                checked={selectedPlatforms.facebook}
                                onChange={() => setSelectedPlatforms(p => ({ ...p, facebook: !p.facebook }))}
                            />
                        </div>

                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="btn-primary"
                            style={{
                                width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem',
                                padding: '0.75rem',
                                background: 'linear-gradient(90deg, #A78BFA, #38BDF8)',
                                opacity: publishing ? 0.7 : 1,
                            }}
                        >
                            {publishing ? <><Loader2 size={16} className="spin" /> Publishing…</> : <><Send size={16} /> Publish now</>}
                        </button>

                        {publishResults && (
                            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {publishResults.results.map((r, i) => (
                                    <div key={i} style={{
                                        padding: '0.6rem 0.75rem',
                                        background: r.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${r.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.8rem',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    }}>
                                        {r.ok ? <CheckCircle size={14} color="#10B981" /> : <AlertTriangle size={14} color="#EF4444" />}
                                        <strong style={{ textTransform: 'capitalize' }}>{r.platform}:</strong>
                                        {r.ok ? (
                                            <>
                                                Published successfully {r.mediaId && `(media ${r.mediaId})`}{r.postId && `(post ${r.postId})`}
                                            </>
                                        ) : (
                                            <span style={{ color: '#fca5a5' }}>{r.error}</span>
                                        )}
                                    </div>
                                ))}
                                {publishResults.results.some(r => !r.ok && r.error?.includes('permission')) && (
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        💡 Need to grant publishing permissions: <a href="/api/auth/facebook" style={{ color: 'var(--accent-primary)' }}>reconnect Facebook</a> and approve the new permissions on the consent screen.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Posts within this campaign — multiple ad creatives can live here */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={16} color="var(--accent-primary)" /> Ads in this campaign
                        </h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {posts.length === 0 ? 'No ads yet — generate your first one below.' : `${posts.length} ${posts.length === 1 ? 'ad' : 'ads'} · ${posts.filter(p => p.status === 'published').length} published`}
                        </p>
                    </div>
                    <button onClick={() => setShowCreator(s => !s)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
                        <Plus size={14} /> {showCreator ? 'Cancel' : 'Generate new ad'}
                    </button>
                </div>

                {showCreator && (
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>What's this ad about?</label>
                        <textarea
                            value={newPostDescription}
                            onChange={e => setNewPostDescription(e.target.value)}
                            placeholder="e.g. New summer collection arrival - lightweight cotton dresses, $40 off this week"
                            rows={3}
                            className="input-base"
                            style={{ background: 'var(--bg-primary)', resize: 'vertical' }}
                        />
                        <button
                            onClick={handleCreatePost}
                            disabled={creating || !newPostDescription.trim()}
                            className="btn-primary"
                            style={{ marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(90deg, #38BDF8, #A78BFA)', opacity: creating ? 0.7 : 1 }}
                        >
                            {creating ? <><Loader2 size={14} className="spin" /> Generating ad…</> : <><Sparkles size={14} /> Generate with AI</>}
                        </button>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>~10–20 seconds — AI writes copy + generates image</p>
                    </div>
                )}

                {postsLoading ? (
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}><Loader2 size={14} className="spin" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Loading ads…</p>
                ) : posts.length === 0 ? null : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {posts.map(p => <PostCard key={p.id} post={p} onDelete={handleDeletePost} onPublish={handlePublishPost} />)}
                    </div>
                )}
            </div>

            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}

const PostCard = ({ post, onDelete, onPublish }) => {
    const [publishing, setPublishing] = useState(false)
    const platforms = post.publishedPlatforms || []
    const handlePublish = async (which) => {
        setPublishing(true)
        try { await onPublish(post.id, which) } finally { setPublishing(false) }
    }
    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1px solid ${post.status === 'published' ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}` }}>
            {post.imageUrl ? (
                <img src={post.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
            ) : (
                <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ImageIcon size={32} /></div>
            )}
            <div style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: post.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                        color: post.status === 'published' ? '#10B981' : '#94A3B8',
                    }}>{post.status}</span>
                    {platforms.length > 0 && (
                        <span style={{ display: 'flex', gap: '0.25rem' }}>
                            {platforms.includes('instagram') && <Instagram size={14} color="#E1306C" />}
                            {platforms.includes('facebook') && <Facebook size={14} color="#1877F2" />}
                        </span>
                    )}
                </div>
                {post.headline && <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{post.headline}</p>}
                {post.body && <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.body}</p>}
                {post.publishError && <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', color: '#fca5a5' }}>⚠ {post.publishError}</p>}

                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {post.status !== 'published' && (
                        <>
                            <button onClick={() => handlePublish(['instagram'])} disabled={publishing} className="btn-secondary" title="Publish to Instagram" style={{ flex: 1, padding: '0.4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
                                <Instagram size={12} /> IG
                            </button>
                            <button onClick={() => handlePublish(['facebook'])} disabled={publishing} className="btn-secondary" title="Publish to Facebook" style={{ flex: 1, padding: '0.4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
                                <Facebook size={12} /> FB
                            </button>
                            <button onClick={() => handlePublish(['instagram', 'facebook'])} disabled={publishing} className="btn-primary" style={{ flex: 1.5, padding: '0.4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', background: 'linear-gradient(90deg, #A78BFA, #38BDF8)' }}>
                                {publishing ? <Loader2 size={12} className="spin" /> : <Send size={12} />} Both
                            </button>
                        </>
                    )}
                    <button onClick={() => onDelete(post.id)} className="btn-secondary" title="Delete" style={{ padding: '0.4rem 0.6rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#EF4444' }}>
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </div>
    )
}

const Row = ({ k, v }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
        <span style={{ fontWeight: 500 }}>{v}</span>
    </div>
)

const Tile = ({ icon: Icon, label, value, color }) => (
    <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.4rem', background: `${color}20`, color, borderRadius: 'var(--radius-md)' }}>
                <Icon size={14} />
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</p>
        </div>
        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{value}</p>
    </div>
)

const PlatformToggle = ({ icon, label, checked, onChange }) => (
    <label style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.6rem 0.75rem', cursor: 'pointer',
        background: checked ? 'rgba(56, 189, 248, 0.06)' : 'var(--bg-secondary)',
        border: `1px solid ${checked ? 'rgba(56, 189, 248, 0.3)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.15s',
    }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: 'var(--accent-primary)' }} />
        {icon}
        <span style={{ flex: 1, fontSize: '0.875rem' }}>{label}</span>
    </label>
)
