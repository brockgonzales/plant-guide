import { doc, getDoc, writeBatch } from 'firebase/firestore'

// One-time update for the Sept 2026 repot/relocation. Guarded by a flag doc so
// later edits made in the Admin Panel are never overwritten.
const FLAG_REF_PATH = ['config', 'migrations']
const FLAG_FIELD = 'relocation2026_09'

const LOCATIONS = {
  'Desk Window': [16, 23, 32],
  'Kitchen Window': [3, 12, 28, 33],
  'Living Room Window': [7, 10, 13, 30],
  'Stairwell Window': [1, 2, 4, 6, 8, 9, 11, 14, 15, 17, 19, 20, 21, 22, 24, 26, 27, 29, 31],
}

const NEW_SPECIES = [
  {
    id: 'plant-32',
    number: 32,
    name: 'Pink Nerve Plant',
    species: "Fittonia albivenis 'Pink Vein'",
    wateringIntervalDays: 7,
    wateringIntervalMaxDays: 7,
    wateringMethod: 'regular',
    simpleInstruction:
      'Water weekly — keep soil lightly moist. Give the leaves a mist with the spray bottle every few days.',
    lightNeeds: 'Bright indirect',
    careNotes:
      'Same care as the Red Nerve Plant (#3). Fittonias collapse dramatically when thirsty but perk back up within hours of watering.',
    warnings: ['Mist leaves every 2-3 days — dry air causes stress'],
  },
  {
    id: 'plant-33',
    number: 33,
    name: 'Baby Rubber Plant',
    species: 'Peperomia obtusifolia',
    wateringIntervalDays: 10,
    wateringIntervalMaxDays: 14,
    wateringMethod: 'regular',
    simpleInstruction:
      'Water from the top until it drains, only when the top half of the soil is dry — roughly every 10–14 days. Empty the saucer afterward.',
    lightNeeds: 'Bright indirect',
    careNotes:
      'Thick leaves store water, so overwatering is the main risk. Soft or yellowing leaves mean too much water.',
    warnings: ['If the soil still feels damp, skip it'],
  },
]

const SPLITS = [
  { sourceId: 'plant-10', id: 'plant-30', number: 30, sourceName: 'Black Rubber Plant (1 of 2)', name: 'Black Rubber Plant (2 of 2)' },
  { sourceId: 'plant-16', id: 'plant-31', number: 31, sourceName: 'Heartleaf Philodendron (1 of 2)', name: 'Heartleaf Philodendron (2 of 2)' },
]

function locationFor(number) {
  return Object.keys(LOCATIONS).find(loc => LOCATIONS[loc].includes(number))
}

function photoFor(number) {
  return { hasPhoto: true, photoPath: `plant-${number}-v2.jpg` }
}

let started = false

export async function applyRelocation2026(db, firestorePlants) {
  if (started) return
  started = true

  const flagRef = doc(db, ...FLAG_REF_PATH)
  const flagSnap = await getDoc(flagRef)
  if (flagSnap.exists() && flagSnap.data()[FLAG_FIELD]) return

  const batch = writeBatch(db)
  const byId = Object.fromEntries(firestorePlants.map(p => [p.id, p]))

  for (const [location, numbers] of Object.entries(LOCATIONS)) {
    for (const number of numbers) {
      const id = `plant-${number}`
      if (byId[id]) batch.update(doc(db, 'plants', id), { location, ...photoFor(number) })
    }
  }

  for (const split of SPLITS) {
    const source = byId[split.sourceId]
    if (!source) continue
    const { nextWaterDate, ...rest } = source
    batch.update(doc(db, 'plants', split.sourceId), { name: split.sourceName })
    batch.set(doc(db, 'plants', split.id), {
      ...rest,
      id: split.id,
      number: split.number,
      name: split.name,
      location: locationFor(split.number),
      isActive: true,
      ...photoFor(split.number),
    })
  }

  for (const plant of NEW_SPECIES) {
    batch.set(doc(db, 'plants', plant.id), {
      ...plant,
      location: locationFor(plant.number),
      isActive: true,
      ...photoFor(plant.number),
    })
  }

  if (byId['plant-25']) batch.update(doc(db, 'plants', 'plant-25'), { isActive: false })

  batch.set(flagRef, { [FLAG_FIELD]: true }, { merge: true })

  try {
    await batch.commit()
  } catch (err) {
    started = false
    console.error('Relocation update failed', err)
  }
}
