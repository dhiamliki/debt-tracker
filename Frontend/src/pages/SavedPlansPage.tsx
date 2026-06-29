import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, Trash2 } from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { formatMonthsWithDate, useCurrencyFormatter } from '@/utils/format'
import { deletePlan, getPlans, type SavedPlan } from '@/services/planService'

export default function SavedPlansPage() {
  const navigate = useNavigate()
  const setDebts = useDebtStore((s) => s.setDebts)
  const setMonthlyBudget = useDebtStore((s) => s.setMonthlyBudget)
  const formatCurrency = useCurrencyFormatter()

  const [plans, setPlans] = useState<SavedPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPlans()
      .then((data) => {
        if (!cancelled) setPlans(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your saved plans.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleLoad = (plan: SavedPlan) => {
    setDebts(plan.debtsSnapshot ?? [])
    setMonthlyBudget(plan.monthlyBudget)
    navigate('/simulation', {
      state: {
        snowball: plan.snowballResult,
        avalanche: plan.avalancheResult,
        monthlyBudget: plan.monthlyBudget,
      },
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePlan(id)
      setPlans((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError('Could not delete that plan. Please try again.')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Saved Plans</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Your saved payoff scenarios. Load one to revisit its simulation.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading your saved plans…</p>
      ) : plans.length === 0 ? (
        <section className="card flex flex-col items-center py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-slate-400 dark:bg-surface-700 dark:text-slate-500">
            <Bookmark className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            No saved plans yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-300">
            Run a simulation and save it to compare scenarios later.
          </p>
          <Link to="/debts" className="btn-primary mt-4">
            Run a simulation
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const totalDebt = (plan.debtsSnapshot ?? []).reduce(
              (sum, d) => sum + d.balance,
              0,
            )
            const months = plan.avalancheResult?.monthsToPayoff
            return (
              <section key={plan.id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</h2>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-400">
                    {new Date(plan.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Monthly budget</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(plan.monthlyBudget)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Total debt</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(totalDebt)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Payoff (Avalanche)</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {months != null ? formatMonthsWithDate(months) : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-2 border-t border-surface-100 pt-4 dark:border-slate-700">
                  <button
                    type="button"
                    className="btn-primary flex-1 py-1.5 text-sm"
                    onClick={() => handleLoad(plan)}
                  >
                    Load
                  </button>
                  {confirmingId === plan.id ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        onClick={() => handleDelete(plan.id)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1.5 text-sm"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label="Delete plan"
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      onClick={() => setConfirmingId(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
