function getStatusInfo(status, lastWatered, plant) {
  if (status === 'due') return { label: 'Water now', className: 'status--due' }
  if (status === 'unknown') return { label: 'Check soil', className: 'status--unknown' }
  if (!lastWatered) return { label: 'Check soil', className: 'status--unknown' }

  const nextDate = new Date(lastWatered)
  nextDate.setDate(nextDate.getDate() + plant.wateringIntervalDays)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextDay = new Date(nextDate)
  nextDay.setHours(0, 0, 0, 0)
  const diff = Math.floor((nextDay - today) / 86400000)

  const dateLabel = diff <= 1
    ? 'tomorrow'
    : nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (status === 'soon') return { label: `Water by ${dateLabel}`, className: 'status--soon' }
  return { label: `Water after ${dateLabel}`, className: 'status--ok' }
}

export default function PlantCard({ plant, status, lastWatered, onClick }) {
  const statusInfo = getStatusInfo(status, lastWatered, plant)

  const fmtDate = d => {
    if (!d) return null
    const days = Math.floor((new Date() - d) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div className={`plant-card ${status === 'due' ? 'plant-card--due' : ''}`} onClick={onClick}>
      <div className="plant-card__photo-wrap">
        {plant.hasPhoto ? (
          <img
            className="plant-card__photo"
            src={`/plant-guide/images/${plant.photoPath}`}
            alt={plant.name}
            loading="lazy"
          />
        ) : (
          <div className="plant-card__photo-placeholder">
            <span>🌿</span>
          </div>
        )}
        <span className="plant-card__number">#{plant.number}</span>
      </div>

      <div className="plant-card__body">
        <div className="plant-card__name">{plant.name}</div>
        <div className="plant-card__species">{plant.species}</div>
        <div className="plant-card__location">📍 {plant.location}</div>

        <div className="plant-card__footer">
          <span className={`status-pill ${statusInfo.className}`}>{statusInfo.label}</span>
          {lastWatered && (
            <span className="plant-card__last-watered">Last: {fmtDate(lastWatered)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
