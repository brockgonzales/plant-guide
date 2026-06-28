import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export function useTrip() {
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'config', 'currentTrip'), snap => {
      if (snap.exists()) {
        const data = snap.data()
        setTrip({
          ...data,
          startDate: data.startDate?.toDate?.() ?? null,
          endDate: data.endDate?.toDate?.() ?? null,
        })
      } else {
        setTrip(null)
      }
      setLoading(false)
    })

    return unsub
  }, [])

  async function setTrip_(tripData) {
    if (!db) return
    await setDoc(doc(db, 'config', 'currentTrip'), {
      destination: tripData.destination,
      startDate: Timestamp.fromDate(new Date(tripData.startDate)),
      endDate: Timestamp.fromDate(new Date(tripData.endDate)),
      hosteeNote: tripData.hosteeNote || '',
    })
  }

  async function clearTrip() {
    if (!db) return
    await deleteDoc(doc(db, 'config', 'currentTrip'))
  }

  function getTripStatus() {
    if (!trip) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(trip.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(trip.endDate)
    end.setHours(0, 0, 0, 0)

    if (today < start) return { phase: 'upcoming', daysUntil: Math.ceil((start - today) / 86400000) }
    if (today > end) return { phase: 'returned' }
    const dayNumber = Math.floor((today - start) / 86400000) + 1
    const totalDays = Math.floor((end - start) / 86400000) + 1
    const daysLeft = Math.ceil((end - today) / 86400000)
    return { phase: 'active', dayNumber, totalDays, daysLeft }
  }

  return { trip, loading, setTrip: setTrip_, clearTrip, getTripStatus }
}
