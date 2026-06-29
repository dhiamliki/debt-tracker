import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { runAvalanche } from '@/utils/simulate'

/** Projected debt-free month as "August 2028", counted from today. */
function payoffMonthYear(months: number): string | null {
  if (!Number.isFinite(months) || months <= 0) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Bell button with a dropdown of sample notifications. */
export default function NotificationBell() {
  const debts = useDebtStore((s) => s.debts)
  const monthlyBudget = useDebtStore((s) => s.monthlyBudget)
  const [open, setOpen] = useState(false)
  const [cleared, setCleared] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Derive the avalanche debt-free date for the "on track" notification.
  const payoffDate = useMemo(() => {
    const totalMinimums = debts.reduce((s, d) => s + d.monthlyPayment, 0)
    if (monthlyBudget <= totalMinimums) return null
    return payoffMonthYear(runAvalanche({ debts, monthlyBudget }).monthsToPayoff)
  }, [debts, monthlyBudget])

  const notes = cleared
    ? []
    : [
        {
          id: '1',
          text: 'Tip: Avalanche saves you money on high-interest debt',
          time: '2h ago',
        },
        {
          id: '2',
          text: payoffDate
            ? `You're on track to be debt free by ${payoffDate}`
            : 'Set a monthly budget to project your debt-free date',
          time: '1d ago',
        },
        {
          id: '3',
          text: 'Run a simulation to see your latest payoff date',
          time: '3d ago',
        },
      ]

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-surface-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-surface-700 dark:hover:text-slate-300"
      >
        <Bell className="h-5 w-5" />
        {notes.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[260px] overflow-hidden rounded-xl border border-surface-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </span>
            {notes.length > 0 && (
              <button
                type="button"
                onClick={() => setCleared(true)}
                className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="border-t border-surface-100 dark:border-slate-700" />

          {notes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No notifications yet
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-surface-100 px-4 py-3 last:border-0 dark:border-slate-700"
                >
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {n.text}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {n.time}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
