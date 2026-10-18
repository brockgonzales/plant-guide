import { doc, getDoc, writeBatch } from 'firebase/firestore'

// One-time add of the three plants bought 2026-10-18. Guarded by a flag doc so
// later Admin Panel edits are never overwritten. Skips any id that already exists.
const FLAG_REF_PATH = ['config', 'migrations']
const FLAG_FIELD = 'newPlants2026_10'
const LOCATION = 'Stairwell Window'
// Watering history is unknown for new purchases, so hold the first reminder a week out.
const FIRST_WATER_DATE = '2026-10-25'

const NEW_PLANTS = [
  {
    id: 'plant-34',
    number: 34,
    name: "Pink Paradise Inch Plant",
    species: "Tradescantia zebrina 'Pink Paradise'",
    wateringIntervalDays: 7,
    wateringIntervalMaxDays: 7,
    wateringMethod: 'regular',
    simpleInstruction:
      'Water weekly — keep the soil evenly moist, never bone dry. Droopy stems mean it is thirsty and it bounces back quickly.',
    lightNeeds: 'Bright indirect to a little direct sun',
    careNotes:
      'Wants more light than most plants here — in dim light the purple fades to green and stems get leggy. Pinch back long stems to keep it full.',
    warnings: [],
  },
  {
    id: 'plant-35',
    number: 35,
    name: "Whisper Nerve Plant",
    species: "Fittonia albivenis 'Whisper'",
    wateringIntervalDays: 7,
    wateringIntervalMaxDays: 7,
    wateringMethod: 'regular',
    simpleInstruction:
      'Water weekly — keep soil lightly moist. Give the leaves a mist with the spray bottle every few days.',
    lightNeeds: 'Low to medium indirect — no direct sun',
    careNotes:
      'Same care as the other nerve plants (#3, #9, #32). Collapses dramatically when thirsty but perks back up within hours of watering. Sits in the humid corner by the humidifier.',
    warnings: ['Keep out of direct sun', 'Mist leaves every 2-3 days — dry air causes stress'],
  },
  {
    id: 'plant-36',
    number: 36,
    name: "Silver Dragon Alocasia",
    species: "Alocasia baginda 'Silver Dragon'",
    wateringIntervalDays: 7,
    wateringIntervalMaxDays: 10,
    wateringMethod: 'regular',
    simpleInstruction:
      'Water every 7-10 days when the top inch of soil is dry, then let it drain fully. Never leave it sitting in water.',
    lightNeeds: 'Bright indirect',
    careNotes:
      'Likes humidity and bright light without hot direct sun. Leaf drop or going dormant in winter can be normal. Sap is irritating if chewed.',
    warnings: ['Do not leave sitting in water — rots easily'],
  },
]

let started = false

export async function applyNewPlants2026_10(db, firestorePlants) {
  if (started) return
  started = true

  const flagRef = doc(db, ...FLAG_REF_PATH)
  const flagSnap = await getDoc(flagRef)
  if (flagSnap.exists() && flagSnap.data()[FLAG_FIELD]) return

  const existing = new Set(firestorePlants.map(p => p.id))
  const batch = writeBatch(db)

  for (const plant of NEW_PLANTS) {
    if (existing.has(plant.id)) continue
    batch.set(doc(db, 'plants', plant.id), {
      ...plant,
      location: LOCATION,
      isActive: true,
      hasPhoto: true,
      photoPath: `plant-${plant.number}-v2.jpg`,
      nextWaterDate: FIRST_WATER_DATE,
    })
  }

  batch.set(flagRef, { [FLAG_FIELD]: true }, { merge: true })

  try {
    await batch.commit()
  } catch (err) {
    started = false
    console.error('New plants update failed', err)
  }
}
