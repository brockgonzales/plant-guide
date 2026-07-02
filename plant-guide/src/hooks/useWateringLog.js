import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
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

  async function logWateringOnDate(plantId, dateStr) {
    if (!db || !dateStr) return
    const d = new Date(dateStr + 'T12:00:00')
    await addDoc(collection(db, 'wateringLog'), {
      plantId,
      wateredAt: Timestamp.fromDate(d),
      wateredBy: 'manual',
      note: 'manually added',
    })
  }

  async function updateWateringEntry(entryId, dateStr) {
    if (!db || !dateStr) return
    const d = new Date(dateStr + 'T12:00:00')
    await updateDoc(doc(db, 'wateringLog', entryId), {
      wateredAt: Timestamp.fromDate(d),
    })
  }

  async function deleteWateringEntry(entryId) {
    if (!db) return
    await deleteDoc(doc(db, 'wateringLog', entryId))
  }

  function getLastWatered(plantId) {
    const entries = log.filter(e => e.plantId === plantId)
    if (!entries.length) return null
    return entries[0].wateredAt?.toDate?.() ?? null
  }

  function getWateringStatus(plant) {
    // Respect manual next water override
    if (plant.nextWaterDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const nextDay = new Date(plant.nextWaterDate)
      nextDay.setHours(0, 0, 0, 0)
      const diff = Math.floor((nextDay - today) / 86400000)
      if (diff <= 0) return 'due'
      if (diff <= 1) return 'soon'
      return 'ok'
    }

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
    if (plant.nextWaterDate) return new Date(plant.nextWaterDate)
    const last = getLastWatered(plant.id)
    if (!last) return null
    const next = new Date(last)
    next.setDate(next.getDate() + plant.wateringIntervalDays)
    return next
  }

  return {
    log, loading,
    logWatering, logWateringOnDate, updateWateringEntry, deleteWateringEntry,
    getLastWatered, getWateringStatus, getNextWaterDate, isDueToday, wasWateredToday,
  }
}
