import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  type LucideIcon,
  PiggyBank,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDebtStore } from '@/store/debtStore'
import { runSnowball, runAvalanche } from '@/utils/simulate'
import { callSimulationApi } from '@/services/simulationService'
import { formatMonthsWithDate, useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { SimulationResult } from '@/types/simulation'

const SNOWBALL_COLOR = '#6366f1' // indigo
const AVALANCHE_COLOR = '#22c55e' // green

/** Projected debt-free month as "August 2028", counted from today. */
function debtFreeDate(months: number): string {
  if (!Number.isFinite(months)) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

type Tab = 'overview' | 'timeline' | 'details'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'details', label: 'Details' },
]

interface SimulationState {
  snowball: SimulationResult
  avalanche: SimulationResult
  monthlyBudget: number
}

export default function SimulationPage() {
  const location = useLocation()
  const debts = useDebtStore((s) => s.debts)
  const formatCurrency = useCurrencyFormatter()
  const [tab, setTab] = useState<Tab>('overview')
  const [extra, setExtra] = useState(0)
  const [lumpSum, setLumpSum] = useState(0)
  const [lumpTarget, setLumpTarget] = useState('auto')
  const state = location.state as SimulationState | null
  const monthlyBudget = state?.monthlyBudget ?? 0

  // Baseline (no extra) and the live "what-if" results (with extra), both
  // recomputed from the current debts so moving the slider updates everything.
  const baseline = useMemo(
    () => ({
      snowball: runSnowball({ debts, monthlyBudget }),
      avalanche: runAvalanche({ debts, monthlyBudget }),
    }),
    [debts, monthlyBudget],
  )
  const adjustedBudget = monthlyBudget + extra
  // Primary results come from the backend simulation API (callSimulationApi
  // falls back to the local engine if the backend is unreachable). Recomputed
  // when the debts or the adjusted budget change.
  const [results, setResults] = useState<{
    snowball: SimulationResult
    avalanche: SimulationResult
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    callSimulationApi(debts, adjustedBudget).then((res) => {
      if (cancelled) return
      setResults(res)
    })
    return () => {
      cancelled = true
    }
  }, [debts, adjustedBudget])

  // Lump sum: which debt receives it ("auto" = highest interest rate), and the
  // Avalanche result after reducing that debt's balance by the lump sum.
  const lumpTargetId = useMemo(() => {
    if (lumpTarget !== 'auto') return lumpTarget
    const open = debts.filter((d) => d.balance > 0)
    if (open.length === 0) return null
    return open.reduce((a, b) => (b.interestRate > a.interestRate ? b : a)).id
  }, [debts, lumpTarget])

  const withLump = useMemo(() => {
    if (lumpSum <= 0 || !lumpTargetId) return null
    const lumpDebts = debts.map((d) =>
      d.id === lumpTargetId
        ? { ...d, balance: Math.max(0, d.balance - lumpSum) }
        : d,
    )
    return runAvalanche({ debts: lumpDebts, monthlyBudget: adjustedBudget })
  }, [debts, lumpTargetId, lumpSum, adjustedBudget])

  // Router state does not survive a reload or a direct visit.
  if (!state?.snowball || !state?.avalanche) {
    return (
      <section className="card">
        <h1 className="text-xl font-semibold text-slate-900">
          No simulation to show
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Run a simulation from the debts page to see your results here.
        </p>
        <Link to="/debts" className="btn-primary mt-4 inline-block">
          Go to debts
        </Link>
      </section>
    )
  }

  // Initial simulation in progress (no results yet).
  if (!results) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const { snowball, avalanche } = results

  const unaffordable = snowball.unaffordable || avalanche.unaffordable

  if (unaffordable) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Simulation results
        </h1>
        <section className="card border-amber-200 bg-amber-50">
          <h2 className="text-lg font-medium text-amber-900">Budget too low</h2>
          <p className="mt-1 text-sm text-amber-800">
            Your monthly budget doesn't cover the total of all minimum payments,
            so these debts can't be paid off. Increase the budget and run the
            simulation again.
          </p>
          <Link to="/debts" className="btn-primary mt-4 inline-block">
            Adjust budget
          </Link>
        </section>
      </div>
    )
  }

  // Winner = less total interest (avalanche wins ties — it's the recommended one).
  const avalancheWins = avalanche.totalInterestPaid <= snowball.totalInterestPaid
  const winner = avalancheWins ? avalanche : snowball
  const loser = avalancheWins ? snowball : avalanche
  const winnerName = avalancheWins ? 'Avalanche' : 'Snowball'
  const loserName = avalancheWins ? 'Snowball' : 'Avalanche'
  const monthsSaved = Math.max(0, loser.monthsToPayoff - winner.monthsToPayoff)
  const interestSaved = Math.max(
    0,
    loser.totalInterestPaid - winner.totalInterestPaid,
  )
  const hasEdge = monthsSaved > 0 || interestSaved > 0

  // What-if impact of the extra payment, measured on the recommended
  // (Avalanche) strategy vs the same strategy with no extra.
  const monthsSooner = Math.max(
    0,
    baseline.avalanche.monthsToPayoff - avalanche.monthsToPayoff,
  )
  const interestSavedByExtra = Math.max(
    0,
    baseline.avalanche.totalInterestPaid - avalanche.totalInterestPaid,
  )
  const debtFreeBy = debtFreeDate(avalanche.monthsToPayoff)

  // Lump-sum impact, measured on the Avalanche strategy vs the same plan
  // without the lump sum (both at the current budget + extra).
  const lumpMonthsSaved = withLump
    ? Math.max(0, avalanche.monthsToPayoff - withLump.monthsToPayoff)
    : 0
  const lumpInterestSaved = withLump
    ? Math.max(0, avalanche.totalInterestPaid - withLump.totalInterestPaid)
    : 0
  const lumpDate = debtFreeDate(
    (withLump ?? avalanche).monthsToPayoff,
  )
  const lumpTargetTitle =
    debts.find((d) => d.id === lumpTargetId)?.title ?? null

  // Starting balance per debt, for the per-debt "Total cost" line.
  const balanceById: Record<string, number> = {}
  for (const d of debts) balanceById[d.id] = d.balance

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Simulation results
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monthly budget: {formatCurrency(monthlyBudget)}
          </p>
        </div>
        <Link to="/debts" className="btn-ghost">
          ← Edit debts
        </Link>
      </header>

      {/* What-If extra payment */}
      <section className="card">
        <div className="flex items-center justify-between">
          <label htmlFor="extra" className="text-sm font-medium text-slate-700">
            Extra monthly payment
          </label>
          <span className="text-sm font-semibold text-primary-600">
            {formatCurrency(extra)}
          </span>
        </div>
        <input
          id="extra"
          type="range"
          min={0}
          max={500}
          step={10}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="mt-3 w-full accent-primary-600"
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Callout
            icon={Clock}
            tint="bg-indigo-50 text-indigo-600"
            label="You'll be debt free"
            value={`${monthsSooner} ${monthsSooner === 1 ? 'month' : 'months'} sooner`}
          />
          <Callout
            icon={PiggyBank}
            tint="bg-green-50 text-green-600"
            label="You'll save"
            value={`${formatCurrency(interestSavedByExtra)} in interest`}
          />
          <Callout
            icon={CalendarCheck}
            tint="bg-blue-50 text-blue-600"
            label="Debt free by"
            value={debtFreeBy}
          />
        </div>
      </section>

      {/* Lump sum calculator */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">
            One-time lump sum payment
          </h2>
          <span className="text-sm font-semibold text-primary-600">
            {formatCurrency(lumpSum)}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="lump"
            type="number"
            min={0}
            step={50}
            placeholder="0"
            value={lumpSum || ''}
            onChange={(e) => setLumpSum(Number(e.target.value) || 0)}
            className="input sm:flex-1"
          />
          <select
            id="lumpTarget"
            className="input sm:w-60"
            value={lumpTarget}
            onChange={(e) => setLumpTarget(e.target.value)}
          >
            <option value="auto">Best debt — auto</option>
            {debts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        {lumpSum > 0 && lumpTarget === 'auto' && lumpTargetTitle && (
          <p className="mt-2 text-xs text-slate-500">
            Applied to {lumpTargetTitle} (highest interest rate)
          </p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Callout
            icon={Clock}
            tint="bg-indigo-50 text-indigo-600"
            label="Months saved"
            value={`${lumpMonthsSaved} ${lumpMonthsSaved === 1 ? 'month' : 'months'}`}
          />
          <Callout
            icon={PiggyBank}
            tint="bg-green-50 text-green-600"
            label="Interest saved"
            value={formatCurrency(lumpInterestSaved)}
          />
          <Callout
            icon={CalendarCheck}
            tint="bg-blue-50 text-blue-600"
            label="New debt free date"
            value={lumpDate}
          />
        </div>
      </section>

      {/* Winner banner */}
      <section className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
        <div>
          <h2 className="text-lg font-semibold text-green-900">
            {winnerName} is your best strategy
          </h2>
          <p className="mt-0.5 text-sm text-green-800">
            {hasEdge
              ? `Saves ${monthsSaved} ${
                  monthsSaved === 1 ? 'month' : 'months'
                } and ${formatCurrency(interestSaved)} in interest vs ${loserName}`
              : `Both strategies pay off in ${formatMonthsWithDate(
                  winner.monthsToPayoff,
                )} with your current budget`}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <ComparisonCards snowball={snowball} avalanche={avalanche} />
      )}

      {tab === 'timeline' && (
        <div className="space-y-6">
          <TimelineChart snowball={snowball} avalanche={avalanche} />
          <BalanceTable snowball={snowball} avalanche={avalanche} />
        </div>
      )}

      {tab === 'details' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PayoffOrderCard
            result={snowball}
            label="Debt Snowball"
            balanceById={balanceById}
          />
          <PayoffOrderCard
            result={avalanche}
            label="Debt Avalanche"
            balanceById={balanceById}
          />
        </div>
      )}

      {/* Run again */}
      <div className="flex justify-center pt-2">
        <Link to="/debts" className="btn-primary">
          Run New Simulation
        </Link>
      </div>
    </div>
  )
}

function ComparisonCards({
  snowball,
  avalanche,
}: {
  snowball: SimulationResult
  avalanche: SimulationResult
}) {
  const interestWinner =
    snowball.totalInterestPaid === avalanche.totalInterestPaid
      ? null
      : snowball.totalInterestPaid < avalanche.totalInterestPaid
        ? 'SNOWBALL'
        : 'AVALANCHE'
  const speedWinner =
    snowball.monthsToPayoff === avalanche.monthsToPayoff
      ? null
      : snowball.monthsToPayoff < avalanche.monthsToPayoff
        ? 'SNOWBALL'
        : 'AVALANCHE'

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <StrategySummary
        label="Debt Snowball"
        sub="Smallest balance first"
        result={snowball}
        winsInterest={interestWinner === 'SNOWBALL'}
        winsSpeed={speedWinner === 'SNOWBALL'}
      />
      <StrategySummary
        label="Debt Avalanche"
        sub="Highest interest first"
        result={avalanche}
        winsInterest={interestWinner === 'AVALANCHE'}
        winsSpeed={speedWinner === 'AVALANCHE'}
      />
    </div>
  )
}

function StrategySummary({
  label,
  sub,
  result,
  winsInterest,
  winsSpeed,
}: {
  label: string
  sub: string
  result: SimulationResult
  winsInterest: boolean
  winsSpeed: boolean
}) {
  const formatCurrency = useCurrencyFormatter()
  return (
    <section className="card">
      <h2 className="text-lg font-medium text-slate-900">{label}</h2>
      <p className="text-sm text-slate-500">{sub}</p>
      <dl className="mt-4 space-y-3">
        <Metric
          term="Total interest paid"
          value={formatCurrency(result.totalInterestPaid)}
          win={winsInterest}
          winLabel="Less interest"
        />
        <Metric
          term="Months to payoff"
          value={formatMonthsWithDate(result.monthsToPayoff)}
          win={winsSpeed}
          winLabel="Faster"
        />
      </dl>
    </section>
  )
}

function Metric({
  term,
  value,
  win,
  winLabel,
}: {
  term: string
  value: string
  win: boolean
  winLabel: string
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-slate-600">{term}</dt>
      <dd className="flex items-center gap-2">
        <span className="font-semibold text-slate-900">{value}</span>
        {win && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            {winLabel}
          </span>
        )}
      </dd>
    </div>
  )
}

function Callout({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: LucideIcon
  tint: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-50 p-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tint,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function TimelineChart({
  snowball,
  avalanche,
}: {
  snowball: SimulationResult
  avalanche: SimulationResult
}) {
  const formatCurrency = useCurrencyFormatter()
  const months = Math.max(snowball.snapshots.length, avalanche.snapshots.length)
  const data = Array.from({ length: months }, (_, i) => ({
    month: i + 1,
    Snowball: snowball.snapshots[i]?.totalBalance ?? 0,
    Avalanche: avalanche.snapshots[i]?.totalBalance ?? 0,
  }))

  return (
    <section className="card">
      <h2 className="mb-4 text-lg font-medium text-slate-900">
        Total Debt Over Time
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickFormatter={(m) => `M${m}`}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              width={84}
              tickFormatter={(v) => formatCurrency(Number(v))}
            />
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              labelFormatter={(m) => `Month ${m}`}
            />
            <Line
              type="monotone"
              dataKey="Snowball"
              stroke={SNOWBALL_COLOR}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Avalanche"
              stroke={AVALANCHE_COLOR}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function PayoffOrderCard({
  result,
  label,
  balanceById,
}: {
  result: SimulationResult
  label: string
  balanceById: Record<string, number>
}) {
  const formatCurrency = useCurrencyFormatter()
  return (
    <section className="card">
      <h2 className="mb-4 text-lg font-medium text-slate-900">
        {label} — payoff order
      </h2>
      <ol className="space-y-2">
        {result.payoffOrder.map((p) => {
          const totalCost = (balanceById[p.debtId] ?? 0) + p.interestPaid
          return (
            <li key={p.debtId} className="rounded-lg bg-surface-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
                    {p.payoffOrder}
                  </span>
                  <span className="font-medium text-slate-900">{p.title}</span>
                </span>
                <span className="text-sm text-slate-600">
                  {formatMonthsWithDate(p.monthsToPayoff)}
                </span>
              </div>
              <p className="mt-1 pl-8 text-xs text-slate-500">
                Total cost: {formatCurrency(totalCost)} (
                {formatCurrency(p.interestPaid)} in interest)
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function BalanceTable({
  snowball,
  avalanche,
}: {
  snowball: SimulationResult
  avalanche: SimulationResult
}) {
  const formatCurrency = useCurrencyFormatter()
  const months = Math.max(snowball.snapshots.length, avalanche.snapshots.length)
  const rows = Array.from({ length: months }, (_, i) => {
    const month = i + 1
    return {
      month,
      snowball: snowball.snapshots[i]?.totalBalance ?? 0,
      avalanche: avalanche.snapshots[i]?.totalBalance ?? 0,
    }
  })

  return (
    <section className="card">
      <h2 className="mb-4 text-lg font-medium text-slate-900">
        Remaining balance by month
      </h2>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-surface-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Month</th>
              <th className="py-2 pr-4 font-medium">Snowball balance</th>
              <th className="py-2 pr-4 font-medium">Avalanche balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.month}
                className="border-b border-surface-100 last:border-0"
              >
                <td className="py-2 pr-4 text-slate-700">{r.month}</td>
                <td className="py-2 pr-4 text-slate-700">
                  {formatCurrency(r.snowball)}
                </td>
                <td className="py-2 pr-4 text-slate-700">
                  {formatCurrency(r.avalanche)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
