import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Target, Zap, CheckCircle2, Rocket, BarChart3, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Landing = () => {
  const navigate = useNavigate()

  return (
    <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0F172A', 
        color: '#E2E8F0', 
        overflowX: 'hidden',
        position: 'relative'
    }}>
      
      {/* Colorful Background Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'rgba(56, 189, 248, 0.15)', filter: 'blur(120px)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '400px', height: '400px', background: 'rgba(167, 139, 250, 0.15)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '600px', height: '600px', background: 'rgba(16, 185, 129, 0.05)', filter: 'blur(150px)', borderRadius: '50%', zIndex: 0 }}></div>

      {/* Navbar */}
      <nav style={{ padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #38BDF8, #A78BFA)', padding: '0.4rem', borderRadius: '0.5rem' }}>
                <Rocket size={20} color="#0F172A" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC' }}>
                AIMarket <span style={{ background: 'linear-gradient(90deg, #38BDF8, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pro</span>
            </h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/api/auth/facebook" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#94A3B8', textDecoration: 'none' }}>Log In</a>
            <a href="/api/auth/facebook" className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.875rem', color: '#0F172A', background: 'linear-gradient(135deg, #38BDF8, #A78BFA)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Get Started
            </a>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 10 }}>
          {/* Hero Section */}
          <section style={{ padding: '10rem 2rem 8rem', textAlign: 'center', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2.5rem', color: '#38BDF8', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                <Sparkles size={16} /> The First Done-For-You AI Ad Service
              </div>
              
              <h1 style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', lineHeight: 1.05, marginBottom: '2rem', letterSpacing: '-0.04em', fontWeight: 900, color: '#F8FAFC' }}>
                Upload your product. <br/>
                <span style={{ background: 'linear-gradient(135deg, #38BDF8, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>We handle everything else.</span>
              </h1>
              
              <p style={{ fontSize: '1.25rem', color: '#94A3B8', maxWidth: '650px', margin: '0 auto 3rem', lineHeight: 1.6, fontWeight: 500 }}>
                Stop wrestling with complex ad managers. Our AI generates the creatives, targets the perfect audience, and optimizes your budget automatically across Meta, Google, and TikTok.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <a href="/api/auth/facebook" className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', background: 'linear-gradient(90deg, #38BDF8, #A78BFA)', color: '#0F172A', boxShadow: '0 10px 25px rgba(56, 189, 248, 0.2)', transition: 'transform 0.2s', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  Log in with Facebook <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                </a>
              </div>
            </motion.div>
          </section>

          {/* How it Works / Colorful Cards */}
          <section style={{ padding: '6rem 2rem', position: 'relative' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h2 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800, color: '#F8FAFC' }}>Three Steps to Revenue</h2>
                <p style={{ color: '#94A3B8', fontSize: '1.25rem', fontWeight: 500 }}>The easiest ad platform ever built.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
                <StepCard 
                  icon={<Target size={32} color="#38BDF8" />}
                  color="rgba(56, 189, 248, 0.1)"
                  border="#38BDF8"
                  title="1. Tell us about it" 
                  desc="Upload an image, video, or just describe your product. AI instantly generates copy, headlines, and stunning creatives."
                />
                <StepCard 
                  icon={<Zap size={32} color="#A78BFA" />}
                  color="rgba(167, 139, 250, 0.1)"
                  border="#A78BFA"
                  title="2. Set boundaries" 
                  desc="We recommend a budget and audience, or you can take control. Tap approve to send the ads to our intelligent optimizer."
                />
                <StepCard 
                  icon={<BarChart3 size={32} color="#34D399" />}
                  color="rgba(52, 211, 153, 0.1)"
                  border="#34D399"
                  title="3. Watch it scale" 
                  desc="We continuously monitor ad performance, pausing losers and pumping budget into the winners to maximize your ROI."
                />
              </div>
            </div>
          </section>

          {/* Social Proof */}
          <section style={{ padding: '6rem 2rem', textAlign: 'center' }}>
             <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: '#64748B', marginBottom: '2rem' }}>Currently optimizing ad spend across</p>
             <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', opacity: 0.6, color: '#E2E8F0' }}>
                 {['Meta Platforms', 'Google Performance Max', 'TikTok Ads Manager', 'X (Twitter) Ads'].map((brand, i) => (
                     <h3 key={i} style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{brand}</h3>
                 ))}
             </div>
          </section>

          {/* CTA */}
          <section style={{ padding: '8rem 2rem 10rem', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', padding: '5rem 2rem', borderRadius: '32px', maxWidth: '900px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 900, lineHeight: 1.1, color: '#F8FAFC' }}>Stop managing ads. <br/>Start managing growth.</h2>
                <a href="/api/auth/facebook" className="btn-primary" style={{ padding: '1.25rem 3rem', fontSize: '1.25rem', background: '#F8FAFC', color: '#0F172A', border: 'none', boxShadow: '0 10px 25px rgba(255,255,255,0.1)', transition: 'transform 0.2s', marginTop: '1rem', textDecoration: 'none', display: 'inline-block' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                Create Your Free Account
                </a>
            </div>
          </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '0.875rem', position: 'relative', zIndex: 10, backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#E2E8F0' }}><Rocket size={16} color="#38BDF8" /> AIMarket Pro</div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span style={{ cursor: 'pointer', fontWeight: 500 }}>Terms of Service</span>
          <span style={{ cursor: 'pointer', fontWeight: 500 }}>Privacy Policy</span>
        </div>
      </footer>
    </div>
  )
}

const StepCard = ({ icon, color, border, title, desc }) => (
  <div style={{ 
      padding: '2.5rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem', 
      background: 'rgba(30, 41, 59, 0.6)', 
      backdropFilter: 'blur(16px)', 
      borderRadius: '24px', 
      border: `1px solid rgba(255, 255, 255, 0.05)`,
      borderTop: `4px solid ${border}`,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      transition: 'transform 0.3s ease',
      cursor: 'default'
  }}
  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'}
  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
        <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem', fontWeight: 700, color: '#F8FAFC' }}>{title}</h3>
        <p style={{ color: '#94A3B8', margin: 0, lineHeight: 1.6, fontSize: '1.05rem' }}>{desc}</p>
    </div>
  </div>
)

export default Landing
