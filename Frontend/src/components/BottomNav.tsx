import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/debts', label: 'Debts', icon: CreditCard },
  { to: '/simulation', label: 'Simulate', icon: TrendingDown },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
]

/** Fixed bottom tab bar — mobile only. "More" opens the sidebar drawer. */
export default function BottomNav({ onMore }: { onMore: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-700 dark:bg-slate-900 lg:hidden">
      <div className="flex h-16">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-400',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-400 transition-colors"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  )
}
