export const LOCATION_ORDER = ['Desk Window', 'Kitchen Window', 'Living Room Window', 'Stairwell Window']

// Returns [[location, plants], ...] in LOCATION_ORDER, with unmatched plants under 'Other' last.
export function groupByLocation(plants) {
  const groups = new Map()
  for (const plant of plants) {
    const key = LOCATION_ORDER.includes(plant.location) ? plant.location : 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(plant)
  }
  return [...LOCATION_ORDER, 'Other'].filter(loc => groups.has(loc)).map(loc => [loc, groups.get(loc)])
}
