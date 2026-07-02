import { useState } from 'react'
import { WATERING_METHODS } from '../data/initialPlants'

export default function TodayTasks({ plants, isDueToday, wasWateredToday, logWatering, getLastWatered, getNextWaterDate, onPlantClick }) {
  const [confirming, setConfirming] = useState(null)

  const activePlants = plants.filter(p => p.isActive)
  const duePlants = activePlants.filter(p => isDueToday(p))
  const wateredToday = activePlants.filter(p => wasWateredToday(p.id))

  async function handleWater(plant) {
    setConfirming(plant.id)
    await logWatering(plant.id)
    setConfirming(null)
  }

  const methodLabel = m => WATERING_METHODS[m] ?? m

  function fmtLastWatered(plant) {
    const last = getLastWatered(plant.id)
    if (!last) return 'No record'
    const days = Math.floor((new Date() - last) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function fmtNextWater(plant) {
    const next = getNextWaterDate(plant)
    if (!next) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextDay = new Date(next)
    nextDay.setHours(0, 0, 0, 0)
    const diff = Math.floor((nextDay - today) / 86400000)
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function fmtNextWaterPill(plant) {
    const next = getNextWaterDate(plant)
    if (!next) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextDay = new Date(next)
    nextDay.setHours(0, 0, 0, 0)
    const diff = Math.floor((nextDay - today) / 86400000)
    if (diff <= 0) return 'today'
    if (diff === 1) return 'tomorrow'
    return next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (duePlants.length === 0 && wateredToday.length === 0) {
    return (
      <section className="today-tasks">
        <h2 className="section-title">Today's Tasks</h2>
        <div className="today-tasks__empty">
          <span className="today-tasks__empty-icon">🌱</span>
          <p>No watering needed today — all plants are good!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="today-tasks">
      <h2 className="section-title">
        Today's Tasks
        {duePlants.length > 0 && (
          <span className="badge badge--due">{duePlants.length} due</span>
        )}
        {wateredToday.length > 0 && (
          <span className="badge badge--done">{wateredToday.length} done</span>
        )}
      </h2>

      {duePlants.length > 0 && (
        <div className="task-list">
          {duePlants.map(plant => (
            <div key={plant.id} className="task-card task-card--due">
              <div className="task-card__info" onClick={() => onPlantClick(plant)}>
                <div className="task-card__header">
                  {plant.hasPhoto ? (
                    <img
                      className="task-card__thumb"
                      src={`/plant-guide/images/${plant.photoPath}`}
                      alt={plant.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="task-card__thumb task-card__thumb--placeholder">🌿</div>
                  )}
                  <div className="task-card__header-text">
                    <div className="task-card__name-row">
                      <span className="task-card__num">#{plant.number}</span>
                      <span className="task-card__name">{plant.name}</span>
                    </div>
                    <div className="task-card__method">{methodLabel(plant.wateringMethod)}</div>
                  </div>
                </div>
                <div className="task-card__instruction">{plant.simpleInstruction}</div>
                <div className="task-card__water-dates">
                  <div>
                    <div className="task-card__water-label">Last watered</div>
                    <div className="task-card__water-value">{fmtLastWatered(plant)}</div>
                  </div>
                  <div>
                    <div className="task-card__water-label">Should water</div>
                    <div className="task-card__water-value">{fmtNextWater(plant)}</div>
                  </div>
                </div>
                {plant.warnings && plant.warnings.length > 0 && (
                  <div className="task-card__warnings">
                    {plant.warnings.map((w, i) => (
                      <div key={i} className="warning-pill">⚠️ {w}</div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn--water"
                disabled={confirming === plant.id}
                onClick={() => handleWater(plant)}
              >
                {confirming === plant.id ? '✓' : 'Mark Watered'}
              </button>
            </div>
          ))}
        </div>
      )}

      {wateredToday.length > 0 && (
        <div className="watered-today">
          <h3 className="watered-today__title">Completed today</h3>
          <div className="watered-today__list">
            {wateredToday.map(plant => {
              const next = fmtNextWaterPill(plant)
              return (
                <div key={plant.id} className="watered-pill" onClick={() => onPlantClick(plant)}>
                  <span className="watered-pill__check">✓</span>
                  <div className="watered-pill__info">
                    <span className="watered-pill__name">#{plant.number} {plant.name}</span>
                    {next && (
                      <span className="watered-pill__next">Don't water before {next}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
