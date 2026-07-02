import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEFAULT_SETTINGS = { enabled: false, recipientEmail: '', senderEmail: '' }

export function useSettings() {
  const [notifSettings, setNotifSettings] = useState(null)

  useEffect(() => {
    if (!db) return
    getDoc(doc(db, 'settings', 'notifications')).then(snap => {
      setNotifSettings(snap.exists() ? snap.data() : DEFAULT_SETTINGS)
    })
  }, [])

  async function saveNotifSettings(settings) {
    if (!db) return
    await setDoc(doc(db, 'settings', 'notifications'), settings)
    setNotifSettings(settings)
  }

  return { notifSettings, saveNotifSettings }
}
