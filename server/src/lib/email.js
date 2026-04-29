// Resend email sending — plain HTTP, no SDK install needed.
// Reference: https://resend.com/docs/api-reference/emails/send-email

import { prisma } from '../db.js'
import { decrypt } from './crypto.js'

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

// Sends a "new lead captured" email to the campaign owner. Silently skips if
// the user hasn't configured a Resend key (we don't want lead capture itself
// to fail just because notifications aren't set up).
export async function sendLeadEmail(userId, lead) {
  try {
    const keys = await prisma.byokKey.findUnique({ where: { userId } })
    if (!keys?.resendKey) return { skipped: 'no_key' }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    if (!user?.email) return { skipped: 'no_user_email' }

    const apiKey = decrypt(keys.resendKey)
    const fromAddress = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev'

    return await send({
      apiKey,
      from: `AIMarket Pro <${fromAddress}>`,
      to: user.email,
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

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
