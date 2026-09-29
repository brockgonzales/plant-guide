import { useState } from 'react'
import { getSavedName, isIOS, isStandalone } from '../hooks/useReminders'

export default function RemindersCard({ reminders, isAdmin }) {
  const { supported, permission, device, dismissed, enable, disable, sendTest, dismiss, undismiss } = reminders
  const [name, setName] = useState(getSavedName)
  const [alwaysRemind, setAlwaysRemind] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function run(action, success) {
    setBusy(true)
    setStatus('')
    try {
      const result = await action()
      if (result !== false && success) setStatus(success)
    } catch (err) {
      console.error(err)
      setStatus('Something went wrong — please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (supported === null || device === undefined) return null

  if (device) {
    return (
      <div className="reminders-card reminders-card--on">
        <div className="reminders-card__summary">
          🔔 Reminders on for <strong>{device.name}</strong> · {device.alwaysRemind ? 'every day plants need water' : 'during trips'}
        </div>
        <div className="reminders-card__actions">
          <button className="btn btn--sm" disabled={busy} onClick={() => run(sendTest, 'Test sent — check your notifications.')}>Send test</button>
          <button className="btn btn--sm" disabled={busy} onClick={() => run(disable)}>Turn off</button>
        </div>
        {status && <p className="reminders-card__status">{status}</p>}
      </div>
    )
  }

  if (!supported && (!isIOS() || isStandalone())) return null

  if (dismissed) {
    return <button className="reminders-link" onClick={undismiss}>🔔 Get watering reminders</button>
  }

  if (!supported) {
    return (
      <div className="reminders-card">
        <div className="reminders-card__title">📲 Get watering reminders on this iPhone</div>
        <ol className="reminders-card__steps">
          <li>Tap the <strong>Share</strong> button (square with an arrow) at the bottom of Safari.</li>
          <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open <strong>Plants</strong> from your home screen and turn on reminders there.</li>
        </ol>
        <button className="btn btn--sm" onClick={dismiss}>Not now</button>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="reminders-card">
        <div className="reminders-card__title">🔕 Notifications are blocked</div>
        <p className="reminders-card__text">To get reminders, turn them on in <strong>Settings → Notifications → Plants</strong>, then reopen the app.</p>
      </div>
    )
  }

  return (
    <div className="reminders-card">
      <div className="reminders-card__title">🔔 Get watering reminders on this phone</div>
      <p className="reminders-card__text">
        {isAdmin && alwaysRemind
          ? "You'll get a notification each morning when plants need water."
          : "You'll get a notification each morning during Brock's trips when plants need water."}
      </p>
      <label className="form-label">Your name
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cole" />
      </label>
      {isAdmin && (
        <label className="checkbox-row">
          <input type="checkbox" checked={alwaysRemind} onChange={e => setAlwaysRemind(e.target.checked)} />
          Remind me every day, not just during trips
        </label>
      )}
      <div className="reminders-card__actions">
        <button
          className="btn btn--primary btn--sm"
          disabled={busy || !name.trim()}
          onClick={() => run(() => enable({ name, alwaysRemind: isAdmin && alwaysRemind }))}
        >
          {busy ? 'Turning on…' : 'Turn on reminders'}
        </button>
        <button className="btn btn--sm" disabled={busy} onClick={dismiss}>Not now</button>
      </div>
      {status && <p className="reminders-card__status">{status}</p>}
    </div>
  )
}
