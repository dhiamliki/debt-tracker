import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useDebtStore } from '@/store/debtStore'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import DebtsPage from './pages/DebtsPage'
import SimulationPage from './pages/SimulationPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RecommendationsPage from './pages/RecommendationsPage'
import WhatIfSimulatorPage from './pages/WhatIfSimulatorPage'
import CalculatorsPage from './pages/CalculatorsPage'
import ExtraPaymentsPage from './pages/ExtraPaymentsPage'
import PreferencesPage from './pages/PreferencesPage'
import HelpSupportPage from './pages/HelpSupportPage'
import SavedPlansPage from './pages/SavedPlansPage'
import ProfilePage from './pages/ProfilePage'
import ComingSoon from './pages/ComingSoon'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

/** Gate protected routes: no token in localStorage → send to login. */
function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const darkMode = useDebtStore((s) => s.darkMode)

  // Reflect the persisted dark-mode preference onto <html> on load and change.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Email verification link target — must be reachable without a token. */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="simulation" element={<SimulationPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="what-if" element={<WhatIfSimulatorPage />} />
          <Route path="calculators" element={<CalculatorsPage />} />
          <Route path="extra-payments" element={<ExtraPaymentsPage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="help" element={<HelpSupportPage />} />
          <Route path="saved-plans" element={<SavedPlansPage />} />
          <Route path="profile" element={<ProfilePage />} />
          {/* Sidebar links not yet built — land on a placeholder, not a blank screen */}
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
