const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const nodemailer = require('nodemailer')

initializeApp()

const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

// ── Shared helpers ────────────────────────────────────────────────

function getLastWatered(log, plantId) {
  const entries = log.filter(e => e.plantId === plantId)
  return entries.length ? entries[0].wateredAt.toDate() : null
}

function isDue(plant, log) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (plant.nextWaterDate) {
    const nextDay = new Date(plant.nextWaterDate)
    nextDay.setHours(0, 0, 0, 0)
    return nextDay <= today
  }
  const last = getLastWatered(log, plant.id)
  if (!last) return true
  const lastDay = new Date(last)
  lastDay.setHours(0, 0, 0, 0)
  return Math.floor((today - lastDay) / 86400000) >= plant.wateringIntervalDays
}

function fmtLastWatered(log, plant) {
  const last = getLastWatered(log, plant.id)
  if (!last) return 'Never recorded'
  const days = Math.floor((new Date() - last) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildEmail(duePlants, log, { isTest } = {}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const testBanner = isTest
    ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:10px 14px;margin-bottom:16px;border-radius:4px;font-size:13px;color:#856404;">
        🧪 <strong>Test email</strong> — this is a preview of what Colleen will receive on days when plants need water.
       </div>`
    : ''

  const noDueBanner = duePlants.length === 0
    ? `<p style="color:#555;font-size:14px;">No plants are due today — this is what a real email will look like when plants need water.</p>`
    : ''

  const plantRows = duePlants.map(p => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;">
        <strong style="color:#1a1a1a;">#${p.number} ${p.name}</strong><br>
        <span style="font-size:12px;color:#888;">Last watered: ${fmtLastWatered(log, p)}</span>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#444;">
        ${p.simpleInstruction}
      </td>
    </tr>
  `).join('')

  const countLine = duePlants.length === 0
    ? ''
    : duePlants.length === 1
      ? `<p style="margin:0 0 16px;font-size:15px;"><strong>1 plant</strong> needs water today:</p>`
      : `<p style="margin:0 0 16px;font-size:15px;"><strong>${duePlants.length} plants</strong> need water today:</p>`

  const table = duePlants.length === 0 ? '' : `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f7f7f7;">
          <th style="padding:8px 14px;text-align:left;font-weight:600;border-bottom:2px solid #eee;color:#555;">Plant</th>
          <th style="padding:8px 14px;text-align:left;font-weight:600;border-bottom:2px solid #eee;color:#555;">Instructions</th>
        </tr>
      </thead>
      <tbody>${plantRows}</tbody>
    </table>
  `

  const subject = isTest
    ? `🧪 Test — Brock's Plant Guide notifications`
    : `🌿 ${duePlants.length} plant${duePlants.length !== 1 ? 's' : ''} need water today — ${dateStr}`

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#2D6A4F;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:20px;">🌿 Plant Watering Reminder</h1>
        <p style="margin:4px 0 0;color:#a8d5b5;font-size:14px;">${dateStr}</p>
      </div>
      <div style="background:#fff;padding:20px 24px;border:1px solid #eee;border-top:none;">
        ${testBanner}${noDueBanner}${countLine}${table}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
          <a href="https://brockgonzales.github.io/plant-guide/"
             style="display:inline-block;background:#2D6A4F;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">
            Open Plant Guide →
          </a>
        </div>
      </div>
      <p style="font-size:11px;color:#aaa;padding:12px 24px;text-align:center;">
        Sent by Brock's Plant Guide · Notifications managed in Admin Panel
      </p>
    </div>
  `

  return { subject, html }
}

async function loadData(db) {
  const settingsDoc = await db.collection('settings').doc('notifications').get()
  if (!settingsDoc.exists) throw new Error('Notifications not configured')
  const { enabled, recipientEmail, senderEmail } = settingsDoc.data()
  if (!recipientEmail || !senderEmail) throw new Error('Email addresses not set')

  const plantsSnap = await db.collection('plants').where('isActive', '==', true).get()
  const plants = plantsSnap.docs.map(d => ({ ...d.data(), id: d.id }))

  const since = new Date()
  since.setDate(since.getDate() - 90)
  const logSnap = await db
    .collection('wateringLog')
    .where('wateredAt', '>=', Timestamp.fromDate(since))
    .orderBy('wateredAt', 'desc')
    .get()
  const log = logSnap.docs.map(d => ({ ...d.data(), id: d.id }))

  return { enabled, recipientEmail, senderEmail, plants, log }
}

async function sendEmail(senderEmail, recipientEmail, subject, html, password) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: senderEmail, pass: password },
  })
  await transporter.sendMail({
    from: `Brock's Plants <${senderEmail}>`,
    to: recipientEmail,
    subject,
    html,
  })
}

// ── Scheduled daily notification ──────────────────────────────────

exports.dailyWateringNotification = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Los_Angeles',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async () => {
    const db = getFirestore()
    const { enabled, recipientEmail, senderEmail, plants, log } = await loadData(db)
    if (!enabled) return

    const duePlants = plants.filter(p => isDue(p, log)).sort((a, b) => a.number - b.number)
    if (!duePlants.length) return

    const { subject, html } = buildEmail(duePlants, log)
    await sendEmail(senderEmail, recipientEmail, subject, html, GMAIL_APP_PASSWORD.value())
    console.log(`Sent to ${recipientEmail} for ${duePlants.length} plants`)
  }
)

// ── On-demand test email (called from Admin Panel) ────────────────

exports.sendTestNotification = onCall(
  { secrets: [GMAIL_APP_PASSWORD] },
  async () => {
    const db = getFirestore()
    const { recipientEmail, senderEmail, plants, log } = await loadData(db)

    const duePlants = plants.filter(p => isDue(p, log)).sort((a, b) => a.number - b.number)
    const { subject, html } = buildEmail(duePlants, log, { isTest: true })
    await sendEmail(senderEmail, recipientEmail, subject, html, GMAIL_APP_PASSWORD.value())
    return { sent: true, plantCount: duePlants.length }
  }
)
