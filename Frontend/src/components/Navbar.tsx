import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  debts: 'Debts',
  simulation: 'Simulations',
  analytics: 'Analytics',
  'saved-plans': 'Saved Plans',
  recommendations: 'Recommendations',
  'what-if': 'What-If Simulator',
  'extra-payments': 'Extra Payments',
  calculators: 'Calculators',
  profile: 'Profile',
  preferences: 'Preferences',
  help: 'Help & Support',
}

export default function Navbar() {
  const location = useLocation()
  const segment = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const current = PAGE_TITLES[segment] ?? 'Dashboard'

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-card">
      <span className="text-lg font-semibold text-slate-900">DebtTracker</span>
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <span>DebtTracker</span>
        <span className="mx-2 text-slate-300">/</span>
        <span className="font-medium text-slate-900">{current}</span>
      </nav>
    </header>
  )
}
