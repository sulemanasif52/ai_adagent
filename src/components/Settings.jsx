import React, { useState, useEffect } from 'react'
import { X, Key, Save, ExternalLink, Bell } from 'lucide-react'

const fields = [
  { key: 'groq_key', label: 'Groq API Key', link: 'https://console.groq.com/keys', hint: 'Free — powers ad copy & chat' },
  { key: 'hf_key', label: 'HuggingFace Token', link: 'https://huggingface.co/settings/tokens', hint: 'Free — powers image generation' },
  { key: 'ig_token', label: 'Instagram Access Token', link: 'https://developers.facebook.com', hint: 'For publishing ads to Instagram' },
  { key: 'ig_user_id', label: 'Instagram Business Account ID', link: '', hint: 'Your IG business account ID' },
]

const alertPrefs = [
  { key: 'alert_budget', label: 'Budget Alerts', desc: 'Get notified when a campaign reaches its budget limit' },
  { key: 'alert_performance', label: 'Performance Alerts', desc: 'Get notified when performance drops below expected levels' },
  { key: 'alert_scale', label: 'Scale Opportunity Alerts', desc: 'Get notified when AI detects a high-ROI scaling opportunity' },
]

const Settings = ({ open, onClose }) => {
  const [vals, setVals] = useState({})
  const [alerts, setAlerts] = useState({ alert_budget: true, alert_performance: true, alert_scale: true })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const v = {}
    fields.forEach(f => v[f.key] = localStorage.getItem(f.key) || '')
    setVals(v)
    const a = {}
    alertPrefs.forEach(p => a[p.key] = localStorage.getItem(p.key) !== 'false')
    setAlerts(a)
  }, [open])

  const handleSave = () => {
    Object.entries(vals).forEach(([k, v]) => localStorage.setItem(k, v.trim()))
    Object.entries(alerts).forEach(([k, v]) => localStorage.setItem(k, v.toString()))
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
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
                type="password"
                value={vals[f.key] || ''}
                onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.hint}
                className="input-base"
              />
            </div>
          ))}
        </div>

        {/* Notification Preferences */}
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

        <button className="btn-primary" onClick={handleSave}
          style={{ width: '100%', marginTop: '2rem' }}>
          <Save size={18} style={{ marginRight: '0.5rem' }} /> {saved ? 'Saved Successfully!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default Settings
