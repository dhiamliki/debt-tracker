import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  Bookmark,
  Calculator,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  type LucideIcon,
  PlusCircle,
  Settings,
  Sliders,
  TrendingDown,
  User,
} from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { cn } from '@/utils/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    heading: 'Menu',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/debts', label: 'Debts', icon: CreditCard },
      { to: '/simulation', label: 'Simulations', icon: TrendingDown },
      { to: '/analytics', label: 'Analytics', icon: BarChart2 },
      { to: '/saved-plans', label: 'Saved Plans', icon: Bookmark },
      { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { to: '/what-if', label: 'What-If Simulator', icon: Sliders },
      { to: '/extra-payments', label: 'Extra Payments', icon: PlusCircle },
      { to: '/calculators', label: 'Calculators', icon: Calculator },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/preferences', label: 'Preferences', icon: Settings },
      { to: '/help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
]

export default function Sidebar() {
  const hasDebts = useDebtStore((s) => s.debts.length > 0)

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col bg-[#0f1729] text-slate-300">
      {/* Logo + app name */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
          <LineChart className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-white">DebtTracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {section.heading}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-600 text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Motivational progress card — only once there's something to track */}
      {hasDebts && (
        <div className="p-3">
          <ProgressCard />
        </div>
      )}
    </aside>
  )
}

function ProgressCard() {
  const debts = useDebtStore((s) => s.debts)
  const total = debts.length
  const paid = debts.filter((d) => d.balance <= 0).length
  const pct = total === 0 ? 0 : Math.round((paid / total) * 100)

  const message =
    pct === 100
      ? "You're debt-free! 🎉"
      : pct === 0
        ? "Let's knock out that first debt"
        : 'Keep going — every payment counts'

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-white">{pct}% debt-free</span>
        <span className="text-xs text-slate-400">
          {paid}/{total} paid
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">{message}</p>
    </div>
  )
}
