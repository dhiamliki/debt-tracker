import { useLocation } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'

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
  const displayName = useUserStore((s) => s.displayName)
  const email = useUserStore((s) => s.email)

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-card dark:bg-surface-800">
      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        DebtTracker
      </span>
      <div className="flex items-center gap-4">
        <nav
          aria-label="Breadcrumb"
          className="text-sm text-slate-500 dark:text-slate-400"
        >
          <span>DebtTracker</span>
          <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {current}
          </span>
        </nav>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {displayName || email || 'User'}
        </span>
      </div>
    </header>
  )
}
