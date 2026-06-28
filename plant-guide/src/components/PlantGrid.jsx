import PlantCard from './PlantCard'

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
    <div className="plant-grid">
      {visible.map(plant => (
        <PlantCard
          key={plant.id}
          plant={plant}
          status={plant.isActive ? getWateringStatus(plant) : 'unknown'}
          lastWatered={getLastWatered(plant.id)}
          onClick={() => onPlantClick(plant)}
        />
      ))}
    </div>
  )
}
