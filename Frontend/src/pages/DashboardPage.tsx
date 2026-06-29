import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarCheck,
  CalendarDays,
  type LucideIcon,
  Pencil,
  Percent,
  Wallet,
} from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { useUserStore } from '@/store/userStore'
import { runSnowball, runAvalanche } from '@/utils/simulate'
import {
  formatMonthsWithDate,
  formatPercent,
  useCurrencyFormatter,
} from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Debt } from '@/types/debt'
import type { SimulationResult } from '@/types/simulation'

/** Shared card styling for the dashboard: a touch more padding + soft shadow. */
const CARD = 'card p-7 shadow-md'

const DTI_TEXT: Record<string, string> = {
  green: 'text-green-600 dark:text-green-300',
  orange: 'text-orange-600 dark:text-orange-300',
  red: 'text-red-600 dark:text-red-300',
  slate: 'text-slate-900 dark:text-slate-100',
}
const DTI_BADGE: Record<string, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  slate: 'bg-surface-100 text-slate-500 dark:bg-surface-700 dark:text-slate-400',
}

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-green-500'
  if (score >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

const DONUT_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
]
const SNOWBALL_COLOR = '#6366f1' // indigo
const AVALANCHE_COLOR = '#22c55e' // green

type Insight ={ tone: 'positive' | 'warning' | 'info'; text: string }

/** Format a month offset from today as "August 2028". */
function monthYearFromNow(months: number): string | null {
  if (!Number.isFinite(months)) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface HealthScore {
  dti: number
  avgRate: number
  debtCount: number
  score: number
  drag: string
}

/**
 * Financial health score out of 100, from debt-to-income (40), average
 * interest rate (30) and number of debts (30). Requires income > 0.
 */
function computeHealthScore(
  totalMinimums: number,
  monthlyIncome: number,
  avgRate: number,
  debtCount: number,
): HealthScore {
  const dti = (totalMinimums / monthlyIncome) * 100
  const dtiPts = dti < 20 ? 40 : dti <= 35 ? 25 : 10
  const ratePts = avgRate < 10 ? 30 : avgRate < 20 ? 18 : 8
  const debtPts = debtCount <= 2 ? 30 : debtCount <= 4 ? 20 : 10
  const score = dtiPts + ratePts + debtPts

  const gaps = [
    { gap: 40 - dtiPts, msg: `your debt payments are ${Math.round(dti)}% of your income` },
    { gap: 30 - ratePts, msg: `your average interest rate is ${avgRate.toFixed(1)}%` },
    { gap: 30 - debtPts, msg: `you're juggling ${debtCount} separate debts` },
  ]
  const worst = gaps.reduce((a, b) => (b.gap > a.gap ? b : a))
  const drag =
    worst.gap <= 0
      ? 'Your finances look healthy across the board.'
      : `Biggest drag: ${worst.msg}.`

  return { dti, avgRate, debtCount, score, drag }
}

/** Derive automatic insights from the debts and simulation results. */
function buildInsights({
  debts,
  snowball,
  avalanche,
  minimumsOnly,
  hasBudget,
  fmt,
}: {
  debts: Debt[]
  snowball: SimulationResult
  avalanche: SimulationResult
  minimumsOnly: SimulationResult
  hasBudget: boolean
  fmt: (value: number) => string
}): Insight[] {
  const insights: Insight[] = []

  // Warning: minimum payment barely dents the balance (near negative amortization).
  for (const d of debts) {
    const monthlyInterest = (d.balance * d.interestRate) / 1200
    if (d.balance > 0 && d.monthlyPayment <= monthlyInterest * 1.1) {
      insights.push({
        tone: 'warning',
        text: `Warning: ${d.title} — your minimum payment barely reduces the balance`,
      })
    }
  }

  // Avalanche vs Snowball savings (only meaningful with surplus budget).
  if (hasBudget) {
    const interestSaved =
      snowball.totalInterestPaid - avalanche.totalInterestPaid
    const monthsSaved = snowball.monthsToPayoff - avalanche.monthsToPayoff
    if (interestSaved > 0 || monthsSaved > 0) {
      const parts: string[] = []
      if (interestSaved > 0) parts.push(fmt(interestSaved))
      if (monthsSaved > 0)
        parts.push(`${monthsSaved} ${monthsSaved === 1 ? 'month' : 'months'}`)
      insights.push({
        tone: 'positive',
        text: `Avalanche saves you ${parts.join(' and ')} compared to Snowball`,
      })
    }
  }

  // Most expensive debt under a minimums-only plan.
  if (!minimumsOnly.unaffordable && minimumsOnly.payoffOrder.length > 0) {
    const top = minimumsOnly.payoffOrder.reduce((a, b) =>
      b.interestPaid > a.interestPaid ? b : a,
    )
    insights.push({
      tone: 'info',
      text: `Your most expensive debt is ${top.title} — it will cost you ${fmt(
        top.interestPaid,
      )} in interest if you pay minimums only`,
    })
  }

  // Highest interest rate worth prioritizing.
  if (debts.length > 0) {
    const highest = debts.reduce((a, b) =>
      b.interestRate > a.interestRate ? b : a,
    )
    if (highest.interestRate >= 15) {
      insights.push({
        tone: 'info',
        text: `${highest.title} has a high interest rate of ${formatPercent(
          highest.interestRate,
        )} — consider prioritizing it`,
      })
    }
  }

  // Debt-free date using the best (Avalanche) strategy.
  if (hasBudget) {
    const date = monthYearFromNow(avalanche.monthsToPayoff)
    if (date) {
      insights.push({
        tone: 'positive',
        text: `You'll be debt free by ${date} using the best strategy`,
      })
    }
  }

  return insights
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const debts = useDebtStore((s) => s.debts)
  const payments = useDebtStore((s) => s.payments)
  const storeBudget = useDebtStore((s) => s.monthlyBudget)
  const monthlyIncome = useDebtStore((s) => s.monthlyIncome)
  const setMonthlyIncome = useDebtStore((s) => s.setMonthlyIncome)
  const showTips = useDebtStore((s) => s.showTips)
  const showHealthScore = useDebtStore((s) => s.showHealthScore)
  const removeDebt = useDebtStore((s) => s.removeDebt)
  const displayName = useUserStore((s) => s.displayName)
  const email = useUserStore((s) => s.email)
  const fmt = useCurrencyFormatter()

  const userName = displayName || email || 'User'
  const userInitial = (displayName || email || 'U').charAt(0).toUpperCase()

  const dark = useDebtStore((s) => s.darkMode)
  const toggleDarkMode = useDebtStore((s) => s.toggleDarkMode)

  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState(
    monthlyIncome ? String(monthlyIncome) : '',
  )

  const totalMinimums = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  // A meaningful comparison needs budget beyond the minimums; only then can the
  // two strategies diverge. Otherwise we prompt the user to set a budget.
  const hasBudget = storeBudget > totalMinimums

  const { snowball, avalanche, minimumsOnly } = useMemo(
    () => ({
      snowball: runSnowball({ debts, monthlyBudget: storeBudget }),
      avalanche: runAvalanche({ debts, monthlyBudget: storeBudget }),
      minimumsOnly: runAvalanche({ debts, monthlyBudget: totalMinimums }),
    }),
    [debts, storeBudget, totalMinimums],
  )

  if (debts.length === 0) {
    return (
      <section className="card">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          No debts yet. Add your debts to see your payoff dashboard.
        </p>
        <Link to="/debts" className="btn-primary mt-4 inline-block">
          Add debts
        </Link>
      </section>
    )
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const interestSaved = hasBudget
    ? Math.max(0, snowball.totalInterestPaid - avalanche.totalInterestPaid)
    : 0
  const savedPct =
    hasBudget && snowball.totalInterestPaid > 0
      ? Math.round((interestSaved / snowball.totalInterestPaid) * 100)
      : 0

  const chartMonths = Math.max(
    snowball.snapshots.length,
    avalanche.snapshots.length,
  )
  const lineData = Array.from({ length: chartMonths }, (_, i) => ({
    month: i + 1,
    snowball: snowball.snapshots[i]?.totalBalance ?? 0,
    avalanche: avalanche.snapshots[i]?.totalBalance ?? 0,
  }))
  // When both strategies trace the same path (e.g. one debt, or budget barely
  // above the minimums) only one line is visible — flag it so we can explain.
  const linesIdentical = lineData.every(
    (d) => Math.abs(d.snowball - d.avalanche) < 0.01,
  )
  const donutData = debts.map((d) => ({ name: d.title, value: d.balance }))

  // Per-debt interest under a minimums-only plan, for the "True Cost" column.
  const minInterestById = new Map(
    minimumsOnly.payoffOrder.map((p) => [p.debtId, p.interestPaid]),
  )
  const totalTrueCost = minimumsOnly.unaffordable
    ? null
    : totalDebt + minimumsOnly.totalInterestPaid

  // Progress from the payments log. Each debt's original balance is its current
  // balance plus everything paid toward it, so % paid = paid / original.
  const paidById = new Map<string, number>()
  for (const p of payments)
    paidById.set(p.debtId, (paidById.get(p.debtId) ?? 0) + p.amount)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalOriginal = totalDebt + totalPaid
  const overallPct =
    totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0
  const paidCount = debts.filter((d) => d.balance <= 0).length

  // Financial health
  const avgRate =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
      : 0
  const dti = monthlyIncome > 0 ? (totalMinimums / monthlyIncome) * 100 : null
  const dtiTone =
    dti === null
      ? 'slate'
      : dti < 20
        ? 'green'
        : dti <= 35
          ? 'orange'
          : 'red'
  const dtiLabel =
    dti === null
      ? '—'
      : dti < 20
        ? 'Healthy'
        : dti <= 35
          ? 'Manageable'
          : 'High Risk'
  const health =
    monthlyIncome > 0
      ? computeHealthScore(totalMinimums, monthlyIncome, avgRate, debts.length)
      : null

  const insights = buildInsights({
    debts,
    snowball,
    avalanche,
    minimumsOnly,
    hasBudget,
    fmt,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Overview of your debt and payoff progress
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={toggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {dark ? <MoonIcon /> : <SunIcon />}
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <BellIcon />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {userInitial}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:inline">
              {userName}
            </span>
          </div>
          <Link to="/debts" className="btn-primary whitespace-nowrap">
            New Simulation
          </Link>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Debt"
          value={fmt(totalDebt)}
          icon={Wallet}
          tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
        />
        <SummaryCard
          label="Monthly Payment"
          value={fmt(totalMinimums)}
          icon={CalendarDays}
          tint="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
        />
        <SummaryCard
          label="Total Interest (All Debts)"
          value={minimumsOnly.unaffordable ? '—' : fmt(minimumsOnly.totalInterestPaid)}
          sub="If paying minimums only"
          icon={Percent}
          tint="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
        />
        <SummaryCard
          label="Debt Free In (Best Strategy)"
          value={
            hasBudget ? formatMonthsWithDate(avalanche.monthsToPayoff) : '—'
          }
          sub="Using Avalanche"
          icon={CalendarCheck}
          tint="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
        />
      </div>

      {/* Financial health */}
      {showHealthScore && (
      <section className={CARD}>
        <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Financial Health
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Monthly income (editable) */}
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monthly income</p>
            {editingIncome ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="100"
                  autoFocus
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-sm"
                  onClick={() => {
                    setMonthlyIncome(Number(incomeInput) || 0)
                    setEditingIncome(false)
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {monthlyIncome > 0 ? fmt(monthlyIncome) : 'Not set'}
                </span>
                <button
                  type="button"
                  aria-label="Edit monthly income"
                  className="rounded-md p-1 text-slate-400 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => {
                    setIncomeInput(monthlyIncome ? String(monthlyIncome) : '')
                    setEditingIncome(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Debt-to-income */}
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Debt-to-Income ratio</p>
            {dti === null ? (
              <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">
                Add your income to calculate
              </p>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn('text-2xl font-semibold', DTI_TEXT[dtiTone])}
                >
                  {dti.toFixed(0)}%
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    DTI_BADGE[dtiTone],
                  )}
                >
                  {dtiLabel}
                </span>
              </div>
            )}
          </div>

          {/* Health score */}
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Health score</p>
            {health === null ? (
              <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">
                Add your income to calculate
              </p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {health.score}
                  <span className="text-base font-normal text-slate-400 dark:text-slate-400">
                    {' '}
                    / 100
                  </span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
                  <div
                    className={cn('h-full rounded-full', scoreColor(health.score))}
                    style={{ width: `${health.score}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        {health && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{health.drag}</p>
        )}
      </section>
      )}

      {/* Debts table + strategy comparison — 60/40 */}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className={cn(CARD, 'lg:col-span-3')}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Your Debts</h2>
            <Link to="/debts" className="btn-ghost text-sm">
              + Add Debt
            </Link>
          </div>

          {/* Overall progress across all debts */}
          <div className="mb-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {overallPct}% debt-free
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {paidCount}/{debts.length} debts paid · {fmt(totalPaid)} paid off
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4 font-medium">Debt</th>
                  <th className="py-2 pr-4 font-medium">Balance</th>
                  <th className="py-2 pr-4 font-medium">Interest Rate</th>
                  <th className="py-2 pr-4 font-medium">Min. Payment</th>
                  <th className="py-2 pr-4 font-medium">True Cost</th>
                  <th className="w-10 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => {
                  const interest = minInterestById.get(d.id)
                  const trueCost =
                    interest === undefined ? null : d.balance + interest
                  const costly = trueCost !== null && trueCost > d.balance * 1.2
                  const paid = paidById.get(d.id) ?? 0
                  const original = d.balance + paid
                  const pctPaid =
                    original > 0 ? Math.round((paid / original) * 100) : 0
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-surface-100 dark:border-slate-700 last:border-0"
                    >
                      <td className="min-w-48 py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-700 text-slate-500 dark:text-slate-400">
                            <DebtIcon title={d.title} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {d.title}
                            </span>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
                                <div
                                  className="h-full rounded-full bg-green-500"
                                  style={{ width: `${pctPaid}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 dark:text-slate-400">
                                {pctPaid}% paid
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                        {fmt(d.balance)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                        {formatPercent(d.interestRate)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                        {fmt(d.monthlyPayment)}
                      </td>
                      <td
                        className={cn(
                          'py-3 pr-4',
                          costly
                            ? 'font-medium text-orange-600 dark:text-orange-300'
                            : 'text-slate-700 dark:text-slate-300',
                        )}
                      >
                        {trueCost === null ? '—' : fmt(trueCost)}
                      </td>
                      <td className="py-3">
                        <RowMenu
                          onEdit={() => navigate('/debts')}
                          onDelete={() => removeDebt(d.id)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100">
                  <td className="py-3 pr-4">Total</td>
                  <td className="py-3 pr-4">{fmt(totalDebt)}</td>
                  <td className="py-3 pr-4 text-slate-400 dark:text-slate-400">—</td>
                  <td className="py-3 pr-4">{fmt(totalMinimums)}</td>
                  <td className="py-3 pr-4">
                    {totalTrueCost === null ? '—' : fmt(totalTrueCost)}
                  </td>
                  <td className="py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className={cn(CARD, 'lg:col-span-2')}>
          <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            Strategy Comparison
          </h2>
          {hasBudget ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-sm">
                <div />
                <div className="font-medium text-primary-600">Snowball</div>
                <div className="font-medium text-green-600">Avalanche</div>

                <div className="text-slate-500 dark:text-slate-400">Time to debt free</div>
                <div className="text-slate-900 dark:text-slate-100">
                  {formatMonthsWithDate(snowball.monthsToPayoff)}
                </div>
                <div className="text-slate-900 dark:text-slate-100">
                  {formatMonthsWithDate(avalanche.monthsToPayoff)}
                </div>

                <div className="text-slate-500 dark:text-slate-400">Total interest paid</div>
                <div className="text-slate-900 dark:text-slate-100">
                  {fmt(snowball.totalInterestPaid)}
                </div>
                <div className="text-slate-900 dark:text-slate-100">
                  {fmt(avalanche.totalInterestPaid)}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-500/10 p-3 text-sm">
                <span className="font-medium text-green-700 dark:text-green-300">
                  Interest saved: {fmt(interestSaved)}
                </span>
                <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {savedPct}% less
                </span>
              </div>
            </div>
          ) : (
            <BudgetPrompt threshold={fmt(totalMinimums)} feature="strategy comparison" />
          )}
        </section>
      </div>

      {/* Insights */}
      {showTips && insights.length > 0 && (
        <section className={CARD}>
          <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">Insights</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {insights.map((ins, i) => (
              <InsightCard key={i} tone={ins.tone} text={ins.text} />
            ))}
          </div>
        </section>
      )}

      {/* Charts — 40/60 */}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className={cn(CARD, 'lg:col-span-2')}>
          <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            Debt Breakdown
          </h2>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {fmt(totalDebt)}
              </span>
            </div>
          </div>
          {/* Legend */}
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {donutData.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="truncate text-slate-600 dark:text-slate-300">{d.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(CARD, 'lg:col-span-3')}>
          <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            Total Debt Over Time
          </h2>
          {hasBudget ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lineData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(m) => `M${m}`}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    width={84}
                    tickFormatter={(v) => fmt(Number(v))}
                  />
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    labelFormatter={(m) => `Month ${m}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="snowball"
                    name="Snowball"
                    stroke={SNOWBALL_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="avalanche"
                    name="Avalanche"
                    stroke={AVALANCHE_COLOR}
                    strokeWidth={2}
                    strokeDasharray={linesIdentical ? '6 4' : undefined}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <BudgetPrompt threshold={fmt(totalMinimums)} feature="the payoff timeline" />
          )}
          {hasBudget && linesIdentical && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
              Both strategies follow the same path here. Increase your budget to
              see strategies diverge.
            </p>
          )}
        </section>
      </div>

      {/* Avalanche payoff order */}
      <section className={CARD}>
        <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Avalanche Payoff Order
        </h2>
        {hasBudget ? (
          <ol className="space-y-2">
            {avalanche.payoffOrder.map((p) => (
              <li
                key={p.debtId}
                className="flex items-center gap-3 rounded-lg bg-surface-50 dark:bg-surface-700 px-3 py-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                  {p.payoffOrder}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{p.title}</span>
                <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                  Paid off in month {p.monthsToPayoff} (
                  {monthYearFromNow(p.monthsToPayoff)})
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <BudgetPrompt threshold={fmt(totalMinimums)} feature="the payoff order" />
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  tint: string
}) {
  return (
    <div className={cn(CARD, 'flex items-start justify-between')}>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{sub}</p>}
      </div>
      <span
        className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tint)}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
  )
}

const INSIGHT_TONES: Record<Insight['tone'], string> = {
  positive: 'border-green-500 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10',
  warning: 'border-orange-500 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10',
  info: 'border-indigo-500 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10',
}

function InsightCard({ tone, text }: Insight) {
  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-4 text-sm text-slate-700 dark:text-slate-300',
        INSIGHT_TONES[tone],
      )}
    >
      {text}
    </div>
  )
}

function BudgetPrompt({
  threshold,
  feature = 'strategy comparison',
}: {
  threshold: string
  feature?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Set a monthly budget above {threshold} to see {feature}.
      </p>
      <Link to="/debts" className="btn-primary mt-3">
        Set budget
      </Link>
    </div>
  )
}

/** Lightweight 3-dot actions menu — closes on outside click, no libraries. */
function RowMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        aria-label="Debt actions"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-slate-700 dark:hover:text-slate-300"
      >
        ⋮
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-20 w-32 overflow-hidden rounded-lg border border-surface-200 dark:border-slate-700 bg-white dark:bg-surface-800 py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Picks an icon from the debt name (card / car / student / loan / default). */
function DebtIcon({ title }: { title: string }) {
  const t = title.toLowerCase()
  if (/card|visa|master|amex|credit/.test(t)) return <CreditCardIcon />
  if (/car|auto|vehicle|motor/.test(t)) return <CarIcon />
  if (/student|school|college|tuition|education|university/.test(t))
    return <GradCapIcon />
  if (/loan|bank|mortgage|personal|home|line of credit/.test(t))
    return <BankIcon />
  return <WalletIcon />
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <Svg>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </Svg>
  )
}

function CarIcon() {
  return (
    <Svg>
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <rect x="3" y="11" width="18" height="6" rx="1" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </Svg>
  )
}

function GradCapIcon() {
  return (
    <Svg>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
    </Svg>
  )
}

function BankIcon() {
  return (
    <Svg>
      <path d="M3 21h18" />
      <path d="M5 21V10M19 21V10M9 21v-6M15 21v-6" />
      <path d="M4 10h16M12 3L4 7v3h16V7z" />
    </Svg>
  )
}

function WalletIcon() {
  return (
    <Svg>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14h2" />
    </Svg>
  )
}

function SunIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  )
}

function MoonIcon() {
  return (
    <Svg>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  )
}

function BellIcon() {
  return (
    <Svg>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  )
}
