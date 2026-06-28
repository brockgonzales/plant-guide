import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function useWateringLog() {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    // Load last 90 days of watering history
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const q = query(
      collection(db, 'wateringLog'),
      where('wateredAt', '>=', Timestamp.fromDate(since)),
      orderBy('wateredAt', 'desc')
    )

    const unsub = onSnapshot(q, snap => {
      setLog(snap.docs.map(d => ({ ...d.data(), id: d.id })))
      setLoading(false)
    })

    return unsub
  }, [])

  async function logWatering(plantId, wateredBy = 'housemate', note = '') {
    if (!db) return
    await addDoc(collection(db, 'wateringLog'), {
      plantId,
      wateredAt: Timestamp.now(),
      wateredBy,
      note,
    })
  }

  function getLastWatered(plantId) {
    const entries = log.filter(e => e.plantId === plantId)
    if (!entries.length) return null
    return entries[0].wateredAt?.toDate?.() ?? null
  }

  function getWateringStatus(plant) {
    const last = getLastWatered(plant.id)
    if (!last) return 'unknown'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastDay = new Date(last)
    lastDay.setHours(0, 0, 0, 0)
    const daysSince = Math.floor((today - lastDay) / 86400000)

    if (daysSince >= plant.wateringIntervalDays) return 'due'
    if (daysSince >= plant.wateringIntervalDays - 1) return 'soon'
    return 'ok'
  }

  function isDueToday(plant) {
    const status = getWateringStatus(plant)
    return status === 'due' || status === 'unknown'
  }

  function wasWateredToday(plantId) {
    const today = new Date().toDateString()
    return log.some(e => e.plantId === plantId && e.wateredAt?.toDate?.()?.toDateString() === today)
  }

  function getNextWaterDate(plant) {
    const last = getLastWatered(plant.id)
    if (!last) return null
    const next = new Date(last)
    next.setDate(next.getDate() + plant.wateringIntervalDays)
    return next
  }

  return { log, loading, logWatering, getLastWatered, getWateringStatus, getNextWaterDate, isDueToday, wasWateredToday }
}
