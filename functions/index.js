const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const sgMail = require('@sendgrid/mail')
const twilio = require('twilio')

initializeApp()

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = defineSecret('TWILIO_PHONE_NUMBER')

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

function buildText(duePlants, { isTest } = {}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (duePlants.length === 0) {
    return `🧪 Test — Brock's Plant Guide: no plants are due today. This is what a real text will look like when plants need water.`
  }

  const plantLines = duePlants
    .map(p => `#${p.number} ${p.name} — ${p.simpleInstruction}`)
    .join('\n')

  const prefix = isTest ? '🧪 Test — ' : ''
  const countLabel = duePlants.length === 1 ? '1 plant needs' : `${duePlants.length} plants need`

  return `${prefix}🌿 ${countLabel} water today (${dateStr}):\n${plantLines}`
}

async function isTripActive(db) {
  const tripDoc = await db.collection('config').doc('currentTrip').get()
  if (!tripDoc.exists) return false
  const { startDate, endDate } = tripDoc.data()
  if (!startDate || !endDate) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = startDate.toDate()
  start.setHours(0, 0, 0, 0)
  const end = endDate.toDate()
  end.setHours(0, 0, 0, 0)

  return today >= start && today <= end
}

async function loadData(db) {
  const settingsDoc = await db.collection('settings').doc('notifications').get()
  if (!settingsDoc.exists) throw new Error('Notifications not configured')
  const { enabled, recipientEmail, senderEmail, recipientPhone, channel = 'email' } = settingsDoc.data()
  if ((channel === 'email' || channel === 'both') && (!recipientEmail || !senderEmail)) {
    throw new Error('Email addresses not set')
  }
  if ((channel === 'text' || channel === 'both') && !recipientPhone) {
    throw new Error('Recipient phone number not set')
  }

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

  return { enabled, recipientEmail, senderEmail, recipientPhone, channel, plants, log }
}

async function sendEmail(senderEmail, recipientEmail, subject, html, apiKey) {
  sgMail.setApiKey(apiKey)
  await sgMail.send({
    to: recipientEmail,
    from: { name: "Brock's Plants", email: senderEmail },
    subject,
    html,
  })
}

async function sendText(recipientPhone, body, accountSid, authToken, fromPhone) {
  const client = twilio(accountSid, authToken)
  await client.messages.create({
    to: recipientPhone,
    from: fromPhone,
    body,
  })
}

async function sendViaChannel(channel, { recipientEmail, senderEmail, recipientPhone, duePlants, log, isTest, secrets }) {
  if (channel === 'email' || channel === 'both') {
    const { subject, html } = buildEmail(duePlants, log, { isTest })
    await sendEmail(senderEmail, recipientEmail, subject, html, secrets.sendgridKey)
  }
  if (channel === 'text' || channel === 'both') {
    const body = buildText(duePlants, { isTest })
    await sendText(recipientPhone, body, secrets.twilioSid, secrets.twilioToken, secrets.twilioPhone)
  }
}

// ── Scheduled daily notification ──────────────────────────────────

const NOTIFICATION_SECRETS = [SENDGRID_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]

exports.dailyWateringNotification = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Los_Angeles',
    secrets: NOTIFICATION_SECRETS,
  },
  async () => {
    const db = getFirestore()

    const tripActive = await isTripActive(db)
    if (!tripActive) {
      console.log('No active trip today — skipping notification')
      return
    }

    const { enabled, recipientEmail, senderEmail, recipientPhone, channel, plants, log } = await loadData(db)
    if (!enabled) return

    const duePlants = plants.filter(p => isDue(p, log)).sort((a, b) => a.number - b.number)
    if (!duePlants.length) return

    await sendViaChannel(channel, {
      recipientEmail, senderEmail, recipientPhone, duePlants, log,
      secrets: {
        sendgridKey: SENDGRID_API_KEY.value(),
        twilioSid: TWILIO_ACCOUNT_SID.value(),
        twilioToken: TWILIO_AUTH_TOKEN.value(),
        twilioPhone: TWILIO_PHONE_NUMBER.value(),
      },
    })
    console.log(`Sent via ${channel} for ${duePlants.length} plants`)
  }
)

// ── On-demand test notification (called from Admin Panel) ─────────

exports.sendTestNotification = onCall(
  { secrets: NOTIFICATION_SECRETS },
  async () => {
    const db = getFirestore()
    const { recipientEmail, senderEmail, recipientPhone, channel, plants, log } = await loadData(db)

    const duePlants = plants.filter(p => isDue(p, log)).sort((a, b) => a.number - b.number)
    await sendViaChannel(channel, {
      recipientEmail, senderEmail, recipientPhone, duePlants, log, isTest: true,
      secrets: {
        sendgridKey: SENDGRID_API_KEY.value(),
        twilioSid: TWILIO_ACCOUNT_SID.value(),
        twilioToken: TWILIO_AUTH_TOKEN.value(),
        twilioPhone: TWILIO_PHONE_NUMBER.value(),
      },
    })
    return { sent: true, plantCount: duePlants.length }
  }
)
