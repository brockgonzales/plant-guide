import PlantCard from './PlantCard'
import { groupByLocation } from '../data/locations'

export default function PlantGrid({ plants, getWateringStatus, getLastWatered, onPlantClick, showInactive }) {
  const visible = showInactive ? plants : plants.filter(p => p.isActive)

  if (visible.length === 0) {
    return (
      <div className="plant-grid__empty">
        <p>No plants to display.</p>
      </div>
    )
  }

  return (
    <div className="location-sections">
      {groupByLocation(visible).map(([location, group]) => (
        <div key={location}>
          <h3 className="location-section__title">
            {location}
            <span className="badge badge--neutral">{group.length}</span>
          </h3>
          <div className="plant-grid">
            {group.map(plant => (
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
