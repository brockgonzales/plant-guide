import { useState } from 'react'
import { isConfigured } from './firebase'
import { usePlants } from './hooks/usePlants'
import { useWateringLog } from './hooks/useWateringLog'
import { useTrip } from './hooks/useTrip'
import Header from './components/Header'
import TripBanner from './components/TripBanner'
import TodayTasks from './components/TodayTasks'
import PlantGrid from './components/PlantGrid'
import PlantDetail from './components/PlantDetail'
import AdminPanel from './components/AdminPanel'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminDirectPlant, setAdminDirectPlant] = useState(null)

  const { plants, loading: plantsLoading, addPlant, updatePlant, deactivatePlant, reactivatePlant } = usePlants()
  const {
    log, logWatering, logWateringOnDate, updateWateringEntry, deleteWateringEntry,
    getLastWatered, getWateringStatus, getNextWaterDate, isDueToday, wasWateredToday,
  } = useWateringLog()
  const { trip, setTrip, clearTrip, getTripStatus } = useTrip()

  const tripStatus = getTripStatus()

  // Clears nextWaterDate override after watering so the schedule resumes normally
  async function handleLogWatering(plantId) {
    await logWatering(plantId)
    const plant = plants.find(p => p.id === plantId)
    if (plant?.nextWaterDate) {
      updatePlant(plantId, { nextWaterDate: null })
    }
  }

  function handleEditPlant(plant) {
    setSelectedPlant(null)
    setAdminDirectPlant(plant)
    setShowAdmin(true)
  }

  function handleCloseAdmin() {
    setShowAdmin(false)
    setAdminDirectPlant(null)
  }

  if (!isConfigured) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <div className="setup-icon">🌿</div>
          <h1>Brock's Plant Guide</h1>
          <p>Firebase is not configured yet. Follow the setup instructions in <code>SETUP.md</code> to connect this app to your database.</p>
          <div className="setup-steps">
            <div className="setup-step">1. Create a Firebase project at console.firebase.google.com</div>
            <div className="setup-step">2. Enable Firestore in the Firebase console</div>
            <div className="setup-step">3. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your values</div>
            <div className="setup-step">4. Run <code>npm run dev</code> again</div>
          </div>
        </div>
      </div>
    )
  }

  if (plantsLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🌿</div>
        <p>Loading plants…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdminClick={() => setShowAdmin(true)}
      />

      <main className="main">
        <TripBanner trip={trip} status={tripStatus} />

        {activeTab === 'today' && (
          <TodayTasks
            plants={plants}
            isDueToday={isDueToday}
            wasWateredToday={wasWateredToday}
            logWatering={handleLogWatering}
            getLastWatered={getLastWatered}
            getNextWaterDate={getNextWaterDate}
            onPlantClick={setSelectedPlant}
          />
        )}

        {activeTab === 'plants' && (
          <section>
            <h2 className="section-title">
              All Plants
              <span className="badge badge--neutral">{plants.filter(p => p.isActive).length} active</span>
            </h2>
            <PlantGrid
              plants={plants}
              getWateringStatus={getWateringStatus}
              getLastWatered={getLastWatered}
              onPlantClick={setSelectedPlant}
              showInactive={false}
            />
          </section>
        )}
      </main>

      {selectedPlant && (
        <PlantDetail
          plant={selectedPlant}
          status={getWateringStatus(selectedPlant)}
          lastWatered={getLastWatered(selectedPlant.id)}
          log={log}
          logWatering={handleLogWatering}
          onClose={() => setSelectedPlant(null)}
          isAdmin={isAdmin}
          onEditPlant={handleEditPlant}
        />
      )}

      {showAdmin && (
        <AdminPanel
          plants={plants}
          trip={trip}
          addPlant={addPlant}
          updatePlant={updatePlant}
          deactivatePlant={deactivatePlant}
          reactivatePlant={reactivatePlant}
          setTrip={setTrip}
          clearTrip={clearTrip}
          onClose={handleCloseAdmin}
          isAuthed={isAdmin}
          onAdminAuth={() => setIsAdmin(true)}
          directEditPlant={adminDirectPlant}
          log={log}
          logWateringOnDate={logWateringOnDate}
          updateWateringEntry={updateWateringEntry}
          deleteWateringEntry={deleteWateringEntry}
        />
      )}
    </div>
  )
}
