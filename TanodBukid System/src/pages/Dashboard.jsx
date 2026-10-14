import React from 'react'

const STORAGE_KEY = 'tanodbukid_profile_setup'

export default function Dashboard() {
  const [profile, setProfile] = React.useState(null)

  React.useEffect(() => {
    try {
      setProfile(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
    } catch {
      setProfile(null)
    }
  }, [])

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <p className="dashboard-kicker">TANOD BUKID</p>
        <h1>Welcome{profile?.barangay ? `, ${profile.barangay}` : ''}.</h1>
        <p>Your farm profile is ready. Keep your farm information and alerts close at hand.</p>
        <div className="dashboard-overview">
          <div><span>Farm type</span><strong>{profile?.farmType || 'Not set'}</strong></div>
          <div><span>Farm area</span><strong>{profile?.farmArea ? `${profile.farmArea} ha` : 'Not set'}</strong></div>
        </div>
      </section>
    </main>
  )
}
