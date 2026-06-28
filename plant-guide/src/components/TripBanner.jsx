export default function TripBanner({ trip, status }) {
  if (!trip || !status) return null

  const fmt = d =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (status.phase === 'upcoming') {
    return (
      <div className="trip-banner trip-banner--upcoming">
        <span className="trip-banner__icon">✈️</span>
        <div>
          <strong>Upcoming: {trip.destination}</strong>
          <span> — starts in {status.daysUntil} day{status.daysUntil !== 1 ? 's' : ''}</span>
          <div className="trip-banner__dates">
            {fmt(trip.startDate)} – {fmt(trip.endDate)}
          </div>
        </div>
      </div>
    )
  }

  if (status.phase === 'active') {
    return (
      <div className="trip-banner trip-banner--active">
        <span className="trip-banner__icon">🌿</span>
        <div>
          <strong>Brock is in {trip.destination}</strong>
          <span className="trip-banner__day"> — Day {status.dayNumber} of {status.totalDays}</span>
          <div className="trip-banner__dates">
            {status.daysLeft} day{status.daysLeft !== 1 ? 's' : ''} left &nbsp;·&nbsp; through {fmt(trip.endDate)}
          </div>
          {trip.hosteeNote && (
            <div className="trip-banner__note">💬 {trip.hosteeNote}</div>
          )}
        </div>
      </div>
    )
  }

  if (status.phase === 'returned') {
    return (
      <div className="trip-banner trip-banner--returned">
        <span className="trip-banner__icon">🏠</span>
        <strong>Brock is back from {trip.destination} — thank you!</strong>
      </div>
    )
  }

  return null
}
