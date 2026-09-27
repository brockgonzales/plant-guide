import PlantCard from './PlantCard'

const LOCATION_ORDER = ['Desk Window', 'Kitchen Window', 'Living Room Window', 'Stairwell Window']

export default function PlantGrid({ plants, getWateringStatus, getLastWatered, onPlantClick, showInactive }) {
  const visible = showInactive ? plants : plants.filter(p => p.isActive)

  if (visible.length === 0) {
    return (
      <div className="plant-grid__empty">
        <p>No plants to display.</p>
      </div>
    )
  }

  const groups = new Map()
  for (const plant of visible) {
    const key = LOCATION_ORDER.includes(plant.location) ? plant.location : 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(plant)
  }

  const orderedLocations = [
    ...LOCATION_ORDER.filter(loc => groups.has(loc)),
    ...(groups.has('Other') ? ['Other'] : []),
  ]

  return (
    <div className="plant-grid-sections">
      {orderedLocations.map(location => (
        <div key={location} className="plant-grid-section">
          <h3 className="plant-grid-section__title">
            {location}
            <span className="badge badge--neutral">{groups.get(location).length}</span>
          </h3>
          <div className="plant-grid">
            {groups.get(location).map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                status={plant.isActive ? getWateringStatus(plant) : 'unknown'}
                lastWatered={getLastWatered(plant.id)}
                onClick={() => onPlantClick(plant)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
