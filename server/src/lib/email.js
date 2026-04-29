// Resend email sending — plain HTTP, no SDK install needed.
// Reference: https://resend.com/docs/api-reference/emails/send-email

import { prisma } from '../db.js'
import { decrypt } from './crypto.js'
import * as groq from './ai/groq.js'

const ENDPOINT = 'https://api.resend.com/emails'

async function send({ apiKey, from, to, subject, html, text }) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.message || `Resend ${res.status}`)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

// Resolves the address that should receive lead notifications. Order:
//   1. Preferences.notificationEmail (user-configured override)
//   2. User.email (FB-linked address — fallback)
async function resolveNotificationEmail(userId) {
  const prefs = await prisma.preferences.findUnique({
    where: { userId },
    select: { notificationEmail: true },
  })
  if (prefs?.notificationEmail) return prefs.notificationEmail
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  return user?.email || null
}

// Sends a "new lead captured" email to the campaign owner.
// Silently skips if the user hasn't configured a Resend key.
export async function sendLeadEmail(userId, lead) {
  try {
    const keys = await prisma.byokKey.findUnique({ where: { userId } })
    if (!keys?.resendKey) return { skipped: 'no_key' }

    const to = await resolveNotificationEmail(userId)
    if (!to) return { skipped: 'no_notification_email' }

    const apiKey = decrypt(keys.resendKey)
    const fromAddress = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev'

    return await send({
      apiKey,
      from: `AIMarket Pro <${fromAddress}>`,
      to,
      subject: `New lead: ${lead.fullName}`,
      html: `
        <h2>You captured a new lead 🎉</h2>
        <p><strong>Name:</strong> ${escapeHtml(lead.fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
        ${lead.phone ? `<p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>` : ''}
        ${lead.source ? `<p><strong>Source:</strong> ${escapeHtml(lead.source)}</p>` : ''}
        ${lead.productId ? `<p><strong>Product:</strong> ${escapeHtml(lead.productId)}</p>` : ''}
        <p style="color:#666;font-size:12px;margin-top:24px">Captured at ${new Date().toISOString()}</p>
      `,
    })
  } catch (err) {
    console.warn('[email] sendLeadEmail failed:', err.message)
    return { error: err.message }
  }
}

// Sends a personalized auto-reply TO the lead. Uses Groq if available to
// generate a friendly, on-brand welcome message. Falls back to a template
// if the user hasn't configured an LLM key.
export async function sendLeadAutoReply(userId, lead) {
  try {
    const keys = await prisma.byokKey.findUnique({ where: { userId } })
    if (!keys?.resendKey) return { skipped: 'no_resend_key' }
    if (!lead.email) return { skipped: 'no_lead_email' }

    const apiKey = decrypt(keys.resendKey)
    const fromAddress = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev'

    const firstName = (lead.fullName || '').split(/\s+/)[0] || 'there'
    const productLabel = lead.productId || lead.source || 'our product'

    // Try AI-generated copy; gracefully fall back to a template.
    let message = null
    if (keys.groqKey) {
      try {
        const out = await groq.chat({
          apiKey: decrypt(keys.groqKey),
          maxTokens: 220,
          messages: [
            { role: 'system', content: 'You write warm, concise customer auto-reply emails. Output 2 short paragraphs of plain text only — no greeting line, no signature. Keep under 80 words.' },
            { role: 'user', content: `Write an auto-reply to a lead named ${firstName} who just signed up for "${productLabel}". Thank them for their interest, hint that exclusive details/discount info is coming in a follow-up, and invite them to reply with any questions. No subject line.` },
          ],
        })
        if (out.text) message = out.text.trim()
      } catch {
        // fall through to template
      }
    }

    if (!message) {
      message = `Thanks so much for your interest in ${productLabel} — we got your details and we're really glad to have you on the list.\n\nWe'll be in touch soon with exclusive details and an early-access perk just for you. In the meantime, feel free to reply to this email with any questions.`
    }

    const html = `
      <p>Hey ${escapeHtml(firstName)},</p>
      ${message.split('\n').filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('\n')}
      <p style="margin-top:1.5rem">— The team</p>
      <p style="color:#999;font-size:11px;margin-top:24px">You received this because you submitted your info on our offer page. If this wasn't you, you can ignore this email.</p>
    `

    return await send({
      apiKey,
      from: `AIMarket Pro <${fromAddress}>`,
      to: lead.email,
      subject: `Thanks for your interest, ${firstName}!`,
      html,
    })
  } catch (err) {
    console.warn('[email] sendLeadAutoReply failed:', err.message)
    return { error: err.message }
  }
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
