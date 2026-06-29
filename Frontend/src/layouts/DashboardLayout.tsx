import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { useUserStore } from '@/store/userStore'
import { useDebtStore } from '@/store/debtStore'
import { getMe } from '@/services/userService'

export default function DashboardLayout() {
  const setProfile = useUserStore((s) => s.setProfile)
  const setMonthlyIncome = useDebtStore((s) => s.setMonthlyIncome)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const touchStartX = useRef(0)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

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
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main
        className="min-w-0 flex-1 px-4 pb-20 pt-6 sm:px-6 lg:pb-0"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touchStartX.current
          // Swipe right from the left edge (first 20px) opens the drawer.
          if (!drawerOpen && touchStartX.current < 20 && diff > 50) {
            setDrawerOpen(true)
          }
          // Swipe left while open closes it.
          if (drawerOpen && diff < -50) {
            setDrawerOpen(false)
          }
        }}
      >
        <Navbar onMenuClick={() => setDrawerOpen(true)} />
        <Outlet />
      </main>
      <BottomNav onMore={() => setDrawerOpen((o) => !o)} />
    </div>
  )
}
