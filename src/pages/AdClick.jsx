import React, { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ShoppingBag, Send, CheckCircle, ArrowLeft, Sparkles, Star, Shield, Truck } from 'lucide-react'

const mockProducts = {
    'summer-collection': {
        name: 'Summer Collection 2026',
        tagline: 'Light, breezy, and bold — designed to turn heads.',
        description: 'Our AI-optimized summer line features sustainable fabrics, trend-forward silhouettes, and vibrant colors that pop on every feed. Limited drop — once it\'s gone, it\'s gone.',
        price: '$89.00',
        campaign: 'Facebook Ads - Summer Collection',
        audience: 'Women 25-34',
        features: ['100% Organic Cotton', 'Free Shipping Over $50', '30-Day Returns'],
    },
    'retargeting': {
        name: 'Premium Essentials Bundle',
        tagline: 'You left something behind — here\'s 15% off to come back.',
        description: 'Complete your order with our best-selling essentials bundle. Curated by AI based on your browsing history for maximum satisfaction.',
        price: '$129.00',
        campaign: 'Instagram - Retargeting',
        audience: 'Tech Enthusiasts',
        features: ['Curated For You', 'Express 2-Day Delivery', 'VIP Support'],
    },
    'default': {
        name: 'New Product Launch',
        tagline: 'Something incredible just dropped. Be the first to know.',
        description: 'Our newest release is here — designed specifically to help you stand out. Powered by data-driven design and crafted with premium materials.',
        price: '$59.00',
        campaign: 'AI Market Pro Campaign',
        audience: 'General',
        features: ['Premium Quality', 'Fast Shipping', 'Easy Returns'],
    }
}

const AdClick = () => {
    const [searchParams] = useSearchParams()
    const productId = searchParams.get('product') || 'default'
    const product = mockProducts[productId] || mockProducts['default']

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) return

        // Save the lead to localStorage (CRM picks this up)
        const existingLeads = JSON.parse(localStorage.getItem('captured_leads') || '[]')
        const newLead = {
            id: Date.now(),
            name: name.trim(),
            email: email.trim(),
            source: product.campaign,
            product: product.name,
            audience: product.audience,
            date: new Date().toLocaleString(),
            status: 'New',
        }
        existingLeads.unshift(newLead)
        localStorage.setItem('captured_leads', JSON.stringify(existingLeads))

        // Generate personalized message
        setMessage(`Hey ${name.split(' ')[0]}! 🎉 Thanks for your interest in ${product.name}. We've reserved your spot — check your inbox at ${email} for an exclusive early-access link and a special discount just for you!`)
        setSubmitted(true)
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem 1rem',
        }}>
            {/* Top Bar */}
            <div style={{
                width: '100%', maxWidth: '900px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '2rem',
            }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    AIMarket <span className="text-gradient">Pro</span>
                </h1>
                <Link to="/dashboard" style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
            </div>

            <div style={{
                width: '100%', maxWidth: '900px',
                display: 'grid',
                gridTemplateColumns: submitted ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)',
                gap: '2rem',
            }}>
                {/* Success State */}
                {submitted ? (
                    <div className="card shadow-lg" style={{
                        padding: '4rem 3rem', textAlign: 'center',
                        borderTop: '4px solid var(--accent-success)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1.5rem',
                            animation: 'popIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                        }}>
                            <CheckCircle size={40} color="var(--accent-success)" />
                        </div>

                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>You're In! 🎉</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '500px', marginBottom: '2rem' }}>
                            {message}
                        </p>

                        <div className="card" style={{
                            padding: '1.5rem', background: 'var(--bg-secondary)',
                            width: '100%', maxWidth: '480px', textAlign: 'left',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <Sparkles size={18} color="var(--accent-primary)" />
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Your Saved Details</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                                    <span style={{ fontWeight: 500 }}>{name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                                    <span style={{ fontWeight: 500 }}>{email}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Product Interest</span>
                                    <span style={{ fontWeight: 500 }}>{product.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                                    <span style={{
                                        padding: '0.2rem 0.6rem', background: 'rgba(79, 70, 229, 0.1)',
                                        color: 'var(--accent-primary)', borderRadius: 'var(--radius-full)',
                                        fontSize: '0.75rem', fontWeight: 600,
                                    }}>Lead Captured ✓</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <Link to="/crm" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>
                                View in CRM
                            </Link>
                            <button className="btn-secondary" onClick={() => { setSubmitted(false); setName(''); setEmail('') }}>
                                Capture Another
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Product Card */}
                        <div className="card shadow-lg" style={{
                            padding: 0, overflow: 'hidden',
                            borderTop: '4px solid var(--accent-primary)',
                            display: 'flex', flexDirection: 'column',
                        }}>
                            {/* Product Image Placeholder */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(167, 139, 250, 0.15))',
                                height: '220px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                borderBottom: '1px solid var(--border-color)',
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{
                                    position: 'absolute', top: '1rem', left: '1rem',
                                    background: 'rgba(239, 68, 68, 0.9)', color: 'white',
                                    padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem', fontWeight: 700,
                                }}>
                                    🔥 LIMITED DROP
                                </div>
                                <ShoppingBag size={64} color="var(--accent-primary)" strokeWidth={1} />
                            </div>

                            <div style={{ padding: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} size={14} fill="#FBBF24" color="#FBBF24" />
                                    ))}
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>4.9 (2,847 reviews)</span>
                                </div>

                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{product.name}</h2>
                                <p style={{ color: 'var(--accent-primary)', fontSize: '1rem', fontWeight: 600, fontStyle: 'italic', marginBottom: '1rem' }}>
                                    {product.tagline}
                                </p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                                    {product.description}
                                </p>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '1rem', background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
                                }}>
                                    <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{product.price}</span>
                                    <span style={{
                                        fontSize: '0.875rem', color: 'var(--text-tertiary)',
                                        textDecoration: 'line-through',
                                    }}>$149.00</span>
                                    <span style={{
                                        padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)',
                                        color: 'var(--accent-success)', borderRadius: 'var(--radius-full)',
                                        fontSize: '0.75rem', fontWeight: 600, marginLeft: 'auto',
                                    }}>SAVE 40%</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {product.features.map((feat, i) => {
                                        const icons = [Shield, Truck, CheckCircle]
                                        const Icon = icons[i] || CheckCircle
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                                <Icon size={16} color="var(--accent-success)" />
                                                <span style={{ color: 'var(--text-secondary)' }}>{feat}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Lead Capture Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card shadow-lg" style={{
                                padding: '2rem',
                                borderTop: '4px solid var(--accent-success)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <div style={{
                                        padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                    }}>
                                        <Sparkles size={20} color="var(--accent-success)" />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Interested? Get Early Access</h3>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Drop your info below and we'll send you an exclusive link + discount code for this product.
                                </p>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            className="input-base"
                                            placeholder="e.g. John Doe"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                            style={{ background: 'var(--bg-secondary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            className="input-base"
                                            placeholder="you@email.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            style={{ background: 'var(--bg-secondary)' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{
                                            width: '100%', padding: '1rem',
                                            fontSize: '1rem', marginTop: '0.5rem',
                                            background: 'linear-gradient(135deg, #10B981, #34D399)',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        }}
                                    >
                                        <Send size={18} style={{ marginRight: '0.5rem' }} /> Claim My Offer
                                    </button>
                                </form>

                                <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                    🔒 We respect your privacy. No spam, ever.
                                </p>
                            </div>

                            {/* Social proof mini card */}
                            <div className="card" style={{
                                padding: '1rem 1.25rem',
                                background: 'var(--bg-secondary)',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                            }}>
                                <div style={{ display: 'flex' }}>
                                    {['SJ', 'MC', 'JT'].map((initials, i) => (
                                        <div key={i} style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: `hsl(${200 + i * 40}, 70%, 50%)`,
                                            color: 'white', fontSize: '0.65rem', fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            marginLeft: i > 0 ? '-8px' : 0,
                                            border: '2px solid var(--bg-secondary)',
                                        }}>
                                            {initials}
                                        </div>
                                    ))}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>142 people</strong> claimed this offer today
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes popIn {
                    0% { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export default AdClick
