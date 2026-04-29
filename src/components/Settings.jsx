import React, { useState, useEffect } from 'react'
import { X, Key, Save, ExternalLink, Bell, Loader2 } from 'lucide-react'
import { getSettings, putSettings, getPreferences, putPreferences } from '../lib/server'

const fields = [
  { key: 'groq_key',          label: 'Groq API Key',               link: 'https://console.groq.com/keys',               hint: 'Free LLM — powers chatbot + classifiers (recommended)' },
  { key: 'gemini_key',        label: 'Google Gemini API Key',      link: 'https://aistudio.google.com/apikey',          hint: 'Free LLM — backup for chat + analysis' },
  { key: 'anthropic_key',     label: 'Anthropic Claude API Key',   link: 'https://console.anthropic.com/settings/keys', hint: 'Best quality copy + script generation (paid)' },
  { key: 'resend_key',        label: 'Resend API Key',             link: 'https://resend.com/api-keys',                 hint: 'Email when a lead is captured (free 3k/mo)' },
  { key: 'news_api_key',      label: 'NewsAPI Key',                link: 'https://newsapi.org/account',                 hint: 'Trends page news feed (free 100/day)' },
  { key: 'cloudflare_token',  label: 'Cloudflare Workers AI Token', link: 'https://dash.cloudflare.com/profile/api-tokens', hint: 'Free image gen fallback' },
  { key: 'cloudflare_account', label: 'Cloudflare Account ID',     link: '',                                            hint: 'Needed for Cloudflare AI' },
  { key: 'hf_token',          label: 'HuggingFace Token (optional)', link: 'https://huggingface.co/settings/tokens',    hint: 'Free image gen fallback' },
  { key: 'fal_key',           label: 'fal.ai Key (optional)',      link: 'https://fal.ai/dashboard/keys',               hint: 'Premium image/video gen — not required' },
  { key: 'ig_token',          label: 'Instagram Access Token (manual fallback)', link: 'https://developers.facebook.com', hint: 'Auto-populated when you Connect Instagram' },
  { key: 'ig_user_id',        label: 'Instagram Business Account ID', link: '',                                          hint: 'Auto-populated when you Connect Instagram' },
]

const alertPrefs = [
  { key: 'alert_budget',      label: 'Budget Alerts',             desc: 'Get notified when a campaign reaches its budget limit' },
  { key: 'alert_performance', label: 'Performance Alerts',        desc: 'Get notified when performance drops below expected levels' },
  { key: 'alert_scale',       label: 'Scale Opportunity Alerts',  desc: 'Get notified when AI detects a high-ROI scaling opportunity' },
]

const Settings = ({ open, onClose }) => {
  const [vals, setVals] = useState({})
  const [alerts, setAlerts] = useState({ alert_budget: true, alert_performance: true, alert_scale: true })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([getSettings(), getPreferences()])
      .then(([s, p]) => {
        if (cancelled) return
        const v = {}
        fields.forEach(f => { v[f.key] = s[f.key] || '' })
        setVals(v)
        setAlerts({
          alert_budget: !!p.alert_budget,
          alert_performance: !!p.alert_performance,
          alert_scale: !!p.alert_scale,
        })
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load settings.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      await Promise.all([putSettings(vals), putPreferences(alerts)])
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 700)
    } catch (e) {
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', width: '32px', height: '32px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} />
        </button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
          <Key size={20} color="var(--accent-primary)" /> API Settings
        </h2>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>
            <Loader2 size={16} className="spin" /> Loading…
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {fields.map(f => (
              <div key={f.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                  {f.link && (
                    <a href={f.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 500 }}>
                      Get key <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <input
                  type={f.key.includes('account') || f.key.includes('user_id') ? 'text' : 'password'}
                  value={vals[f.key] || ''}
                  onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.hint}
                  className="input-base"
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1.25rem' }}>
            <Bell size={20} color="var(--accent-primary)" /> Notification Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alertPrefs.map(pref => (
              <label key={pref.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${alerts[pref.key] ? 'rgba(56, 189, 248, 0.2)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <div
                  onClick={(e) => { e.preventDefault(); setAlerts(p => ({ ...p, [pref.key]: !p[pref.key] })) }}
                  style={{
                    width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                    background: alerts[pref.key] ? 'var(--accent-primary)' : 'transparent',
                    border: `2px solid ${alerts[pref.key] ? 'var(--accent-primary)' : 'var(--text-tertiary)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', cursor: 'pointer'
                  }}
                >
                  {alerts[pref.key] && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{pref.label}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{pref.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving || loading}
          style={{ width: '100%', marginTop: '2rem', opacity: saving || loading ? 0.7 : 1 }}>
          {saving ? <Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} /> : <Save size={18} style={{ marginRight: '0.5rem' }} />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>

        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

export default Settings
