import { useEffect, useState, type FormEvent } from 'react'
import { useDebtStore } from '@/store/debtStore'
import { useUserStore } from '@/store/userStore'
import { getMe, updateMe } from '@/services/userService'
import { useCurrencyFormatter } from '@/utils/format'

export default function ProfilePage() {
  const debts = useDebtStore((s) => s.debts)
  const setMonthlyIncome = useDebtStore((s) => s.setMonthlyIncome)
  const setProfile = useUserStore((s) => s.setProfile)
  const formatCurrency = useCurrencyFormatter()

  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [income, setIncome] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((p) => {
        if (cancelled) return
        setEmail(p.email)
        setCreatedAt(p.createdAt)
        setName(p.displayName ?? '')
        setIncome(p.monthlyIncome != null ? String(p.monthlyIncome) : '')
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load your profile.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await updateMe({
        displayName: name.trim(),
        monthlyIncome: Number(income) || 0,
      })
      // Keep the navbar and the dashboard DTI in sync.
      setProfile({
        email: updated.email,
        displayName: updated.displayName,
        createdAt: updated.createdAt,
      })
      setMonthlyIncome(updated.monthlyIncome ?? 0)
      setSaved(true)
    } catch {
      setError('Could not save your changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '—'
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Manage your account details and income.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading your profile…</p>
      ) : (
        <>
          {/* Account stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Debts" value={String(debts.length)} />
            <StatCard label="Total debt" value={formatCurrency(totalDebt)} />
            <StatCard label="Member since" value={memberSince} />
          </div>

          {/* Editable details */}
          <section className="card max-w-xl">
            <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Account details
            </h2>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
                {error}
              </div>
            )}
            {saved && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300">
                Profile updated ✓
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input bg-surface-100 text-slate-500 dark:bg-surface-700 dark:text-slate-400"
                  value={email}
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="label" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="monthlyIncome">
                  Monthly income
                </label>
                <input
                  id="monthlyIncome"
                  type="number"
                  min="0"
                  step="50"
                  className="input"
                  placeholder="0.00"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Used to calculate your debt-to-income ratio on the dashboard.
                </p>
              </div>

              <button
                type="submit"
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}
