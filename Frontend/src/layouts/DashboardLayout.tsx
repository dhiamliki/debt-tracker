import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useUserStore } from '@/store/userStore'
import { useDebtStore } from '@/store/debtStore'
import { getMe } from '@/services/userService'

export default function DashboardLayout() {
  const setProfile = useUserStore((s) => s.setProfile)
  const setMonthlyIncome = useDebtStore((s) => s.setMonthlyIncome)

  // Load the user's profile once for the authenticated area. The monthly
  // income drives the dashboard DTI, so mirror it into the debt store.
  useEffect(() => {
    let cancelled = false
    getMe()
      .then((profile) => {
        if (cancelled) return
        setProfile({
          email: profile.email,
          displayName: profile.displayName,
          createdAt: profile.createdAt,
        })
        if (profile.monthlyIncome != null) {
          setMonthlyIncome(profile.monthlyIncome)
        }
      })
      .catch(() => {
        /* Navbar falls back to a generic label if this fails. */
      })
    return () => {
      cancelled = true
    }
  }, [setProfile, setMonthlyIncome])

  return (
    <div className="flex min-h-screen bg-surface-50 text-slate-900 dark:bg-surface-900 dark:text-slate-100">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-6">
        <Navbar />
        <Outlet />
      </main>
    </div>
  )
}
