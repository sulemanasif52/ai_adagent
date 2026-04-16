import React from 'react'
import { CreditCard, ShieldCheck, Download, History, Facebook, MonitorPlay, Zap, Youtube, Instagram, Info } from 'lucide-react'

const invoices = [
    { id: 'INV-2026-001', date: 'Apr 01, 2026', amount: '$49.00', status: 'Paid', plan: 'AI Pro Plan' },
    { id: 'INV-2026-002', date: 'Mar 01, 2026', amount: '$49.00', status: 'Paid', plan: 'AI Pro Plan' },
]

const Billing = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Billing & Integrations</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your platform fee and ad account connections.</p>
            </div>

            {/* How Billing Works Callout */}
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
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>How Billing Works</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Ad Spend</strong> — Your own payment card is charged directly by each ad network (Meta, Google, etc.). We never touch your ad budget.
                        <br />
                        <strong style={{ color: 'var(--text-primary)' }}>Service Fee</strong> — A separate monthly fee for AI Market Pro's AI tools, optimization engine, and support. Pay via Stripe or PayPal below.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '2rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Advertising Accounts Subscriptions/Integrations */}
                    <div className="card shadow-lg" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={20} color="var(--accent-primary)" /> Ad Account Connections
                            </h2>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Your connected advertising platforms. Your card is charged directly by these networks for ad spend.</p>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Instagram size={32} color="#E1306C" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>Instagram Business</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Connected as @sarahstyles</p>
                                    </div>
                                </div>
                                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Manage Sync</button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Youtube size={32} color="#FF0000" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>Google Ads (YouTube Studio)</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Connected as Sarah Jenkins</p>
                                    </div>
                                </div>
                                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Manage Sync</button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Facebook size={32} color="#1877F2" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>Meta Ads Manager</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Connected as Sarah Jenkins</p>
                                    </div>
                                </div>
                                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Manage Sync</button>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <MonitorPlay size={32} color="#000000" />
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>TikTok Ads Manager</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Not connected</p>
                                    </div>
                                </div>
                                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Connect Account</button>
                            </div>
                        </div>
                    </div>

                    {/* Platform Service Fee UI */}
                    <div className="card shadow-lg" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Platform Service Fee</h2>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Your payment method for AIMarket Pro AI features.</p>
                            </div>
                            <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600 }}>AI Pro Plan</span>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>$49.00 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/ month</span></p>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Next billing date is May 01, 2026.</p>
                            </div>
                            <button className="btn-secondary">Change Plan</button>
                        </div>
                    </div>

                </div>

                {/* Right Column: Payment Methods & Invoices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    <div className="card shadow-lg" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={18} /> Payment Methods
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ width: '48px', height: '32px', background: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                                VISA
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>Visa ending in 4242</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expires 12/28</p>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}>Edit</span>
                        </div>
                        
                        {/* Stripe & PayPal Options */}
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pay service fee with:</p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', fontSize: '0.875rem' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.038c0 3.886 2.916 5.607 5.814 6.671 2.172.806 2.972 1.471 2.972 2.409 0 .974-.776 1.542-2.172 1.542-1.965 0-5.193-1.2-6.768-2.072L2.714 21.1C4.469 22.02 7.405 24 11.747 24c2.592 0 4.715-.636 6.222-1.888 1.589-1.32 2.408-3.18 2.408-5.406 0-3.976-2.955-5.681-6.401-7.546z" fill="#635BFF"/>
                                    </svg>
                                    Stripe
                                </button>
                                <button className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', fontSize: '0.875rem' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .76-.654h6.15c2.042 0 3.448.42 4.18 1.25.344.39.565.81.676 1.29.115.51.117 1.12.006 1.86l-.009.043v.502l.39.22a2.88 2.88 0 0 1 .789.58c.316.378.52.84.608 1.37.09.546.06 1.196-.089 1.93-.17.85-.447 1.59-.824 2.2-.35.565-.78 1.03-1.29 1.384a5.24 5.24 0 0 1-1.67.797c-.618.174-1.32.26-2.09.26h-.496a1.49 1.49 0 0 0-1.472 1.257l-.038.2-.634 4.014-.028.143c-.01.072-.03.107-.058.13a.14.14 0 0 1-.09.036H7.076z" fill="#253B80"/>
                                        <path d="M19.438 8.088c-.01.07-.025.14-.04.21-.899 4.612-3.97 6.204-7.894 6.204H9.506a.971.971 0 0 0-.96.82l-1.023 6.484-.29 1.837a.511.511 0 0 0 .505.59h3.547c.42 0 .777-.305.843-.719l.035-.18.668-4.23.043-.233a.853.853 0 0 1 .842-.72h.53c3.435 0 6.125-1.395 6.911-5.43.329-1.684.159-3.09-.71-4.076a3.38 3.38 0 0 0-.959-.767z" fill="#179BD7"/>
                                    </svg>
                                    PayPal
                                </button>
                            </div>
                        </div>

                        <button className="btn-secondary" style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={16} /> Add Payment Method
                        </button>
                    </div>

                    <div className="card shadow-lg" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={18} /> Invoice History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {invoices.map(inv => (
                                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{inv.amount} • {inv.plan}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inv.date} ({inv.status})</p>
                                    </div>
                                    <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }} title="Download PDF">
                                        <Download size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default Billing
