import { useState, useEffect } from 'react'
import { WATERING_METHODS, initialPlants } from '../data/initialPlants'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234'

const BLANK_PLANT = {
  number: '',
  name: '',
  species: '',
  location: '',
  wateringIntervalDays: 7,
  wateringIntervalMaxDays: 7,
  wateringMethod: 'regular',
  simpleInstruction: '',
  lightNeeds: '',
  careNotes: '',
  warnings: [],
  isActive: true,
  hasPhoto: false,
  photoPath: '',
  nextWaterDate: null,
}

export default function AdminPanel({ plants, trip, addPlant, updatePlant, deactivatePlant, reactivatePlant, setTrip, clearTrip, onClose, isAuthed, onAdminAuth, directEditPlant, log = [], logWateringOnDate, updateWateringEntry, deleteWateringEntry, notifSettings, saveNotifSettings }) {
  const [pin, setPin] = useState('')
  const [authed, setAuthed] = useState(() => isAuthed ?? false)
  const [pinError, setPinError] = useState(false)
  const [view, setView] = useState(() => (isAuthed && directEditPlant) ? 'edit-plant' : 'home')
  const [editingPlant, setEditingPlant] = useState(() => (isAuthed && directEditPlant) ? directEditPlant : null)
  const [plantForm, setPlantForm] = useState(() =>
    (isAuthed && directEditPlant)
      ? { ...directEditPlant, warnings: [...(directEditPlant.warnings ?? [])] }
      : BLANK_PLANT
  )
  const [warningInput, setWarningInput] = useState('')
  const [logEdits, setLogEdits] = useState({})
  const [newLogDate, setNewLogDate] = useState('')
  const [tripForm, setTripForm] = useState({
    destination: trip?.destination ?? '',
    startDate: trip?.startDate ? toInputDate(trip.startDate) : '',
    endDate: trip?.endDate ? toInputDate(trip.endDate) : '',
    hosteeNote: trip?.hosteeNote ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [notifForm, setNotifForm] = useState(null)

  function toInputDate(d) {
    return new Date(d).toISOString().split('T')[0]
  }

  function checkPin() {
    if (pin === ADMIN_PIN) {
      setAuthed(true)
      setPinError(false)
      onAdminAuth?.()
    } else {
      setPinError(true)
    }
  }

  function startEdit(plant) {
    setEditingPlant(plant)
    setPlantForm({ ...plant, warnings: [...(plant.warnings ?? [])] })
    setView('edit-plant')
  }

  function startAdd() {
    const maxNum = Math.max(...plants.map(p => p.number), 0)
    setPlantForm({ ...BLANK_PLANT, number: maxNum + 1 })
    setWarningInput('')
    setView('add-plant')
  }

  function pfChange(field, val) {
    setPlantForm(p => ({ ...p, [field]: val }))
  }

  function addWarning() {
    if (!warningInput.trim()) return
    setPlantForm(p => ({ ...p, warnings: [...p.warnings, warningInput.trim()] }))
    setWarningInput('')
  }

  function removeWarning(i) {
    setPlantForm(p => ({ ...p, warnings: p.warnings.filter((_, idx) => idx !== i) }))
  }

  const plantLog = editingPlant
    ? log.filter(e => e.plantId === editingPlant.id).slice(0, 10)
    : []

  function toLogDate(entry) {
    const d = entry.wateredAt?.toDate?.()
    if (!d) return ''
    return d.toISOString().split('T')[0]
  }

  async function saveLogEntry(entry) {
    const dateVal = logEdits[entry.id] ?? toLogDate(entry)
    await updateWateringEntry(entry.id, dateVal)
    setLogEdits(prev => { const n = { ...prev }; delete n[entry.id]; return n })
    flash('Entry updated')
  }

  async function addPastWatering() {
    if (!newLogDate || !editingPlant) return
    await logWateringOnDate(editingPlant.id, newLogDate)
    setNewLogDate('')
    flash('Watering entry added')
  }

  async function savePlant() {
    setSaving(true)
    const data = {
      ...plantForm,
      number: parseInt(plantForm.number),
      wateringIntervalDays: parseInt(plantForm.wateringIntervalDays),
      wateringIntervalMaxDays: parseInt(plantForm.wateringIntervalMaxDays),
      nextWaterDate: plantForm.nextWaterDate || null,
    }
    if (view === 'add-plant') {
      data.id = `plant-${data.number}`
      await addPlant(data)
      flash('Plant added!')
    } else {
      await updatePlant(editingPlant.id, data)
      flash('Plant updated!')
    }
    setSaving(false)
    setView('home')
  }

  async function saveTrip() {
    setSaving(true)
    await setTrip(tripForm)
    flash('Trip saved!')
    setSaving(false)
    setView('home')
  }

  function flash(m) {
    setMsg(m)
    setTimeout(() => setMsg(''), 3000)
  }

  useEffect(() => {
    if (notifSettings && !notifForm) setNotifForm(notifSettings)
  }, [notifSettings])

  async function saveNotif() {
    if (!notifForm || !saveNotifSettings) return
    await saveNotifSettings(notifForm)
    flash('Notification settings saved')
  }

  if (!authed) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal modal--narrow">
          <button className="modal__close" onClick={onClose}>✕</button>
          <div className="modal__body">
            <h2>Admin Access</h2>
            <p className="text-muted">Enter your PIN to manage plants and trips.</p>
            <input
              className={`input ${pinError ? 'input--error' : ''}`}
              type="password"
              inputMode="numeric"
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkPin()}
              autoFocus
            />
            {pinError && <p className="error-text">Incorrect PIN</p>}
            <button className="btn btn--primary btn--full" onClick={checkPin}>Unlock</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal__close" onClick={onClose}>✕</button>
        <div className="modal__body">

          {msg && <div className="alert alert--success">{msg}</div>}

          {view === 'home' && (
            <>
              <h2>Admin Panel</h2>

              <div className="admin-section">
                <h3>Trip</h3>
                {trip ? (
                  <div className="admin-trip-info">
                    <p><strong>{trip.destination}</strong></p>
                    <p>{new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}</p>
                    <div className="admin-row">
                      <button className="btn btn--sm" onClick={() => { setTripForm({ destination: trip.destination, startDate: toInputDate(trip.startDate), endDate: toInputDate(trip.endDate), hosteeNote: trip.hosteeNote ?? '' }); setView('trip') }}>Edit Trip</button>
                      <button className="btn btn--sm btn--danger" onClick={async () => { await clearTrip(); flash('Trip cleared') }}>Clear</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn--primary" onClick={() => setView('trip')}>Set Upcoming Trip</button>
                )}
              </div>

              <div className="admin-section">
                <h3>Plants</h3>
                <button className="btn btn--primary" onClick={startAdd}>+ Add New Plant</button>
                <div className="admin-plant-list">
                  {plants.map(p => (
                    <div key={p.id} className={`admin-plant-row ${!p.isActive ? 'admin-plant-row--inactive' : ''}`}>
                      <span className="admin-plant-row__name">#{p.number} {p.name}</span>
                      <div className="admin-row">
                        <button className="btn btn--sm" onClick={() => startEdit(p)}>Edit</button>
                        {p.isActive
                          ? <button className="btn btn--sm btn--danger" onClick={() => deactivatePlant(p.id)}>Remove</button>
                          : <button className="btn btn--sm btn--success" onClick={() => reactivatePlant(p.id)}>Restore</button>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-section">
                <h3>Notifications</h3>
                {!notifForm ? (
                  <p className="text-muted">Loading…</p>
                ) : (
                  <>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={notifForm.enabled}
                        onChange={e => setNotifForm(f => ({ ...f, enabled: e.target.checked }))}
                      />
                      Send daily watering reminders
                    </label>
                    <span className="form-hint">When enabled, an email is sent each morning at 8 am (Pacific) listing plants that need water. Turn on before you travel, off when you return.</span>
                    {notifForm.enabled && (
                      <div className="form-grid" style={{ marginTop: 12 }}>
                        <label className="form-label form-label--full">Notify email
                          <input
                            className="input"
                            type="email"
                            value={notifForm.recipientEmail}
                            onChange={e => setNotifForm(f => ({ ...f, recipientEmail: e.target.value }))}
                            placeholder="mills.colleenk@gmail.com"
                          />
                        </label>
                        <label className="form-label form-label--full">Send from (your Gmail)
                          <input
                            className="input"
                            type="email"
                            value={notifForm.senderEmail}
                            onChange={e => setNotifForm(f => ({ ...f, senderEmail: e.target.value }))}
                            placeholder="brock.gonzales@gmail.com"
                          />
                          <span className="form-hint">Must be the Gmail account whose App Password was configured.</span>
                        </label>
                      </div>
                    )}
                    <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={saveNotif}>
                      Save Notifications
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {(view === 'add-plant' || view === 'edit-plant') && (
            <>
              <button className="btn btn--back" onClick={() => setView('home')}>← Back</button>
              <h2>{view === 'add-plant' ? 'Add Plant' : 'Edit Plant'}</h2>

              <div className="form-grid">
                <label className="form-label">Plant #
                  <input className="input" type="number" value={plantForm.number} onChange={e => pfChange('number', e.target.value)} />
                </label>
                <label className="form-label">Display Name
                  <input className="input" value={plantForm.name} onChange={e => pfChange('name', e.target.value)} placeholder="e.g. Snake Plant" />
                </label>
                <label className="form-label">Species
                  <input className="input" value={plantForm.species} onChange={e => pfChange('species', e.target.value)} placeholder="e.g. Sansevieria trifasciata" />
                </label>
                <label className="form-label">Location
                  <input className="input" value={plantForm.location} onChange={e => pfChange('location', e.target.value)} placeholder="e.g. Hallway — south window" />
                </label>
                <label className="form-label">Water every (min days)
                  <input className="input" type="number" value={plantForm.wateringIntervalDays} onChange={e => pfChange('wateringIntervalDays', e.target.value)} />
                </label>
                <label className="form-label">Water every (max days)
                  <input className="input" type="number" value={plantForm.wateringIntervalMaxDays} onChange={e => pfChange('wateringIntervalMaxDays', e.target.value)} />
                </label>
                <label className="form-label">Watering Method
                  <select className="input" value={plantForm.wateringMethod} onChange={e => pfChange('wateringMethod', e.target.value)}>
                    {Object.entries(WATERING_METHODS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="form-label">Light Needs
                  <input className="input" value={plantForm.lightNeeds} onChange={e => pfChange('lightNeeds', e.target.value)} placeholder="e.g. Bright indirect" />
                </label>
                <label className="form-label form-label--full">Simple Instruction (for housemate)
                  <textarea className="input input--textarea" value={plantForm.simpleInstruction} onChange={e => pfChange('simpleInstruction', e.target.value)} rows={3} />
                </label>
                <label className="form-label form-label--full">Care Notes
                  <textarea className="input input--textarea" value={plantForm.careNotes} onChange={e => pfChange('careNotes', e.target.value)} rows={3} />
                </label>
                <label className="form-label form-label--full">Photo filename (in /public/images/)
                  <input className="input" value={plantForm.photoPath} onChange={e => pfChange('photoPath', e.target.value)} placeholder="e.g. plant-28.jpg" />
                  <label className="checkbox-row">
                    <input type="checkbox" checked={plantForm.hasPhoto} onChange={e => pfChange('hasPhoto', e.target.checked)} />
                    Has photo
                  </label>
                </label>

                <div className="form-label form-label--full">
                  <span className="form-label__text">Warnings / Special Instructions</span>
                  {plantForm.warnings.map((w, i) => (
                    <div key={i} className="warning-input-row">
                      <span>{w}</span>
                      <button className="btn btn--sm btn--danger" onClick={() => removeWarning(i)}>✕</button>
                    </div>
                  ))}
                  <div className="warning-add-row">
                    <input className="input" value={warningInput} onChange={e => setWarningInput(e.target.value)} placeholder="Add a warning..." onKeyDown={e => e.key === 'Enter' && addWarning()} />
                    <button className="btn btn--sm" onClick={addWarning}>Add</button>
                  </div>
                </div>

                <label className="form-label form-label--full">Override next water date
                  <input
                    className="input"
                    type="date"
                    value={plantForm.nextWaterDate || ''}
                    onChange={e => pfChange('nextWaterDate', e.target.value || null)}
                  />
                  <span className="form-hint">Set to force a specific next-water date. Clears automatically when plant is watered. Leave blank to use the calculated schedule.</span>
                </label>
              </div>

              <button className="btn btn--primary btn--full" onClick={savePlant} disabled={saving}>
                {saving ? 'Saving...' : 'Save Plant'}
              </button>

              {view === 'edit-plant' && (
                <div className="admin-section admin-section--log">
                  <h3>Watering History</h3>
                  {plantLog.length === 0 && <p className="text-muted">No history in the last 90 days.</p>}
                  {plantLog.map(entry => {
                    const dateVal = logEdits[entry.id] ?? toLogDate(entry)
                    return (
                      <div key={entry.id} className="log-edit-row">
                        <input
                          className="input input--date-sm"
                          type="date"
                          value={dateVal}
                          onChange={e => setLogEdits(prev => ({ ...prev, [entry.id]: e.target.value }))}
                        />
                        <button className="btn btn--sm btn--success" onClick={() => saveLogEntry(entry)}>Save</button>
                        <button className="btn btn--sm btn--danger" onClick={async () => { await deleteWateringEntry(entry.id); flash('Entry deleted') }}>Delete</button>
                      </div>
                    )
                  })}
                  <div className="log-add-row">
                    <span className="form-label__text">Add past watering</span>
                    <div className="log-edit-row">
                      <input
                        className="input input--date-sm"
                        type="date"
                        value={newLogDate}
                        onChange={e => setNewLogDate(e.target.value)}
                      />
                      <button className="btn btn--sm btn--primary" onClick={addPastWatering}>+ Add</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {view === 'trip' && (
            <>
              <button className="btn btn--back" onClick={() => setView('home')}>← Back</button>
              <h2>Set Trip</h2>

              <div className="form-grid">
                <label className="form-label form-label--full">Destination
                  <input className="input" value={tripForm.destination} onChange={e => setTripForm(t => ({ ...t, destination: e.target.value }))} placeholder="e.g. India" />
                </label>
                <label className="form-label">Start Date
                  <input className="input" type="date" value={tripForm.startDate} onChange={e => setTripForm(t => ({ ...t, startDate: e.target.value }))} />
                </label>
                <label className="form-label">End Date
                  <input className="input" type="date" value={tripForm.endDate} onChange={e => setTripForm(t => ({ ...t, endDate: e.target.value }))} />
                </label>
                <label className="form-label form-label--full">Note for housemate (optional)
                  <textarea className="input input--textarea" value={tripForm.hosteeNote} onChange={e => setTripForm(t => ({ ...t, hosteeNote: e.target.value }))} rows={2} placeholder="e.g. Call me if anything looks really sick! +1-555-..." />
                </label>
              </div>

              <button className="btn btn--primary btn--full" onClick={saveTrip} disabled={saving}>
                {saving ? 'Saving...' : 'Save Trip'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
