import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { initialPlants } from '../data/initialPlants'

export function usePlants() {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!db) {
      setPlants(initialPlants)
      setLoading(false)
      return
    }

    const q = query(collection(db, 'plants'), orderBy('number'))
    const unsub = onSnapshot(q, async snap => {
      if (snap.empty && !seeded) {
        setSeeded(true)
        await seedPlants()
      } else {
        const firestorePlants = snap.docs.map(d => ({ ...d.data(), id: d.id }))
        setPlants(firestorePlants)
        setLoading(false)
        // Migrate: update photos, deactivate plant-18, seed new plants 28 & 29
        for (const fp of firestorePlants) {
          const source = initialPlants.find(p => p.id === fp.id)
          if (source?.hasPhoto && !fp.hasPhoto) {
            updateDoc(doc(db, 'plants', fp.id), {
              hasPhoto: true,
              photoPath: source.photoPath,
            })
          }
        }
        // Deactivate plant-18 if it still exists in Firestore
        const plant18ref = doc(db, 'plants', 'plant-18')
        const plant18snap = await getDoc(plant18ref)
        if (plant18snap.exists() && plant18snap.data().isActive !== false) {
          updateDoc(plant18ref, { isActive: false })
        }
        // Seed new plants 28 & 29 if not already in Firestore
        for (const newId of ['plant-28', 'plant-29']) {
          if (!firestorePlants.find(fp => fp.id === newId)) {
            const plant = initialPlants.find(p => p.id === newId)
            if (plant) setDoc(doc(db, 'plants', newId), plant)
          }
        }
      }
    })

    return unsub
  }, [])

  async function seedPlants() {
    for (const plant of initialPlants) {
      await setDoc(doc(db, 'plants', plant.id), plant)
    }
  }

  async function addPlant(plant) {
    if (!db) return
    const id = `plant-${plant.number}`
    await setDoc(doc(db, 'plants', id), { ...plant, id })
  }

  async function updatePlant(id, updates) {
    if (!db) return
    await updateDoc(doc(db, 'plants', id), updates)
  }

  async function deactivatePlant(id) {
    if (!db) return
    await updateDoc(doc(db, 'plants', id), { isActive: false })
  }

  async function reactivatePlant(id) {
    if (!db) return
    await updateDoc(doc(db, 'plants', id), { isActive: true })
  }

  return { plants, loading, addPlant, updatePlant, deactivatePlant, reactivatePlant }
}
