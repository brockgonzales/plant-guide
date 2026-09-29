import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging'
import { httpsCallable } from 'firebase/functions'
import { app, db, fns } from '../firebase'

const DEVICE_KEY = 'plantGuide.deviceId'
const NAME_KEY = 'plantGuide.name'
const DISMISSED_KEY = 'plantGuide.remindersDismissed'

function readLocal(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeLocal(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* private mode: reminders still work for this session */ }
}

function getDeviceId() {
  let id = readLocal(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    writeLocal(DEVICE_KEY, id)
  }
  return id
}

export function getSavedName() {
  return readLocal(NAME_KEY) || ''
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

async function registerAndGetToken() {
  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  const registration = await navigator.serviceWorker.ready
  return getToken(getMessaging(app), { serviceWorkerRegistration: registration })
}

export function useReminders() {
  const [supported, setSupported] = useState(null)
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'))
  const [deviceId, setDeviceId] = useState(() => readLocal(DEVICE_KEY))
  const [device, setDevice] = useState(undefined)
  const [dismissed, setDismissed] = useState(() => readLocal(DISMISSED_KEY) === '1')

  useEffect(() => {
    if (!app) { setSupported(false); return }
    isSupported().then(setSupported).catch(() => setSupported(false))
  }, [])

  useEffect(() => {
    if (!db) return
    if (!deviceId) { setDevice(null); return }
    return onSnapshot(doc(db, 'devices', deviceId), snap => setDevice(snap.exists() ? snap.data() : null))
  }, [deviceId])

  // Tokens can rotate; refresh the stored one each time the app opens.
  useEffect(() => {
    if (!supported || !device || permission !== 'granted') return
    registerAndGetToken()
      .then(token => {
        if (token && token !== device.token) {
          setDoc(doc(db, 'devices', deviceId), { token, updatedAt: serverTimestamp() }, { merge: true })
        }
      })
      .catch(err => console.warn('Could not refresh reminder token', err))
  }, [supported, device?.token, permission])

  async function enable({ name, alwaysRemind }) {
    // Must be the first await: iOS only allows the prompt directly from a tap.
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return false

    const token = await registerAndGetToken()
    const id = getDeviceId()
    await setDoc(doc(db, 'devices', id), {
      token,
      name: name.trim(),
      alwaysRemind: Boolean(alwaysRemind),
      updatedAt: serverTimestamp(),
    })
    writeLocal(NAME_KEY, name.trim())
    setDeviceId(id)
    return true
  }

  async function disable() {
    await deleteDoc(doc(db, 'devices', deviceId))
    try { await deleteToken(getMessaging(app)) } catch { /* token may already be gone */ }
  }

  async function setAlwaysRemind(value) {
    await setDoc(doc(db, 'devices', deviceId), { alwaysRemind: value, updatedAt: serverTimestamp() }, { merge: true })
  }

  async function sendTest() {
    const call = httpsCallable(fns, 'sendTestPush')
    const res = await call({ deviceId })
    return res.data
  }

  function dismiss() {
    writeLocal(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  function undismiss() {
    writeLocal(DISMISSED_KEY, null)
    setDismissed(false)
  }

  return { supported, permission, device, dismissed, enable, disable, setAlwaysRemind, sendTest, dismiss, undismiss }
}
