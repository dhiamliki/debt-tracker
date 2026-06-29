import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import UserMenu from './UserMenu'
import NotificationBell from './NotificationBell'

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

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation()
  const segment = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const current = PAGE_TITLES[segment] ?? 'Dashboard'
  const displayName = useUserStore((s) => s.displayName)
  const email = useUserStore((s) => s.email)

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-card dark:bg-surface-800">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-surface-100 dark:text-slate-300 dark:hover:bg-surface-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          to="/dashboard"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          DebtTracker
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <nav
          aria-label="Breadcrumb"
          className="hidden text-sm text-slate-500 sm:block dark:text-slate-400"
        >
          <span>DebtTracker</span>
          <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {current}
          </span>
        </nav>
        <NotificationBell />
        <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-300">
          {displayName || email || 'User'}
        </span>
        <UserMenu />
      </div>
    </header>
  )
}
