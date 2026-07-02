import { useState } from 'react'
import { WATERING_METHODS } from '../data/initialPlants'

export default function PlantDetail({ plant, status, lastWatered, nextWaterDate, log, logWatering, onClose, isAdmin, onEditPlant }) {
  const [watering, setWatering] = useState(false)

  if (!plant) return null

  const fmtDate = d => {
    if (!d) return 'Never recorded'
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const intervalLabel =
    plant.wateringIntervalDays === plant.wateringIntervalMaxDays
      ? `Every ${plant.wateringIntervalDays} days`
      : `Every ${plant.wateringIntervalDays}–${plant.wateringIntervalMaxDays} days`

  const recentLog = log
    .filter(e => e.plantId === plant.id)
    .slice(0, 5)

  async function handleWater() {
    setWatering(true)
    await logWatering(plant.id)
    setWatering(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal__close" onClick={onClose}>✕</button>

        {plant.hasPhoto ? (
          <img
            className="modal__photo"
            src={`/plant-guide/images/${plant.photoPath}`}
            alt={plant.name}
          />
        ) : (
          <div className="modal__photo-placeholder">🌿</div>
        )}

        <div className="modal__body">
          <div className="modal__number-row">
            <div className="modal__number-badge">Plant #{plant.number}</div>
            {isAdmin && (
              <button className="btn btn--sm btn--edit" onClick={() => onEditPlant(plant)}>
                ✏️ Edit
              </button>
            )}
          </div>
          <h2 className="modal__name">{plant.name}</h2>
          <p className="modal__species">{plant.species}</p>
          <p className="modal__location">📍 {plant.location}</p>

          {!plant.isActive && (
            <div className="alert alert--inactive">This plant is no longer in the collection.</div>
          )}

          {plant.isActive && (
            <>
              <div className="modal__section">
                <h3>How to Water</h3>
                <div className="modal__method-tag">{WATERING_METHODS[plant.wateringMethod]}</div>
                <p className="modal__instruction">{plant.simpleInstruction}</p>
                <div className="modal__frequency">
                  🗓 {intervalLabel}
                </div>
              </div>

              {plant.warnings.length > 0 && (
                <div className="modal__section">
                  <h3>Important Notes</h3>
                  {plant.warnings.map((w, i) => (
                    <div key={i} className="alert alert--warning">⚠️ {w}</div>
                  ))}
                </div>
              )}

              <div className="modal__section">
                <h3>Light & Care</h3>
                <p><strong>Light:</strong> {plant.lightNeeds}</p>
                <p className="modal__care-notes">{plant.careNotes}</p>
              </div>

              <div className="modal__section">
                <h3>Watering History</h3>
                <div className="modal__last-watered">
                  Last watered: <strong>{fmtDate(lastWatered)}</strong>
                </div>
                {nextWaterDate && (
                  <div className="modal__next-water">
                    Next water: <strong>{fmtDate(nextWaterDate)}</strong>
                  </div>
                )}
                {recentLog.length > 0 ? (
                  <ul className="watering-log">
                    {recentLog.map(entry => (
                      <li key={entry.id} className="watering-log__entry">
                        <span>{fmtDate(entry.wateredAt?.toDate?.())}</span>
                        {entry.note && <span className="watering-log__note"> · {entry.note}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No history recorded yet.</p>
                )}
              </div>

              <button
                className="btn btn--water btn--full"
                onClick={handleWater}
                disabled={watering}
              >
                {watering ? 'Logged ✓' : 'Mark as Watered Today'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
