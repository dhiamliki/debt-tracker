import { useEffect, useMemo, useRef, useState } from 'react'
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
import { savePlan } from '@/services/planService'
import { formatMonthsWithDate, useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Debt } from '@/types/debt'
import type { SimulationResult } from '@/types/simulation'

const SNOWBALL_COLOR = '#6366f1' // indigo
const AVALANCHE_COLOR = '#22c55e' // green

// Per-debt accent colors (matches the DebtsPage table ordering).
const DEBT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899']

/** Projected debt-free month as "August 2028", counted from today. */
function debtFreeDate(months: number): string {
  if (!Number.isFinite(months)) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Payoff cell label as "Month 6 (Dec 2026)", counted from today. */
function payoffMonthLabel(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  const when = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `Month ${months} (${when})`
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
  const storeBudget = useDebtStore((s) => s.monthlyBudget)
  const lastSnowballResult = useDebtStore((s) => s.lastSnowballResult)
  const lastAvalancheResult = useDebtStore((s) => s.lastAvalancheResult)
  const formatCurrency = useCurrencyFormatter()
  const [tab, setTab] = useState<Tab>('overview')
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next')
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const tabIndex = TABS.findIndex((t) => t.key === tab)
  const changeTab = (target: Tab) => {
    const targetIdx = TABS.findIndex((t) => t.key === target)
    if (targetIdx === tabIndex) return
    setSlideDir(targetIdx > tabIndex ? 'next' : 'prev')
    setTab(target)
  }
  const [extra, setExtra] = useState(0)
  const [lumpSum, setLumpSum] = useState(0)
  const [lumpTarget, setLumpTarget] = useState('auto')
  const state = location.state as SimulationState | null

  // Use the fresh run passed via router state; otherwise fall back to the last
  // persisted simulation so navigating away and back still shows results.
  const sourceSnowball = state?.snowball ?? lastSnowballResult
  const sourceAvalanche = state?.avalanche ?? lastAvalancheResult
  const monthlyBudget = state?.monthlyBudget ?? storeBudget

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

  // Save-plan UI state.
  const [showSave, setShowSave] = useState(false)
  const [planName, setPlanName] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )

  const handleSavePlan = async () => {
    const name = planName.trim()
    if (!name || !results) return
    setSaveState('saving')
    try {
      await savePlan(name, debts, adjustedBudget, {
        snowball: results.snowball,
        avalanche: results.avalanche,
      })
      setSaveState('saved')
      setShowSave(false)
      setPlanName('')
    } catch {
      setSaveState('error')
    }
  }

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

  // No fresh run and nothing persisted — nothing to show.
  if (!sourceSnowball || !sourceAvalanche) {
    return (
      <section className="card">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          No simulation to show
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Simulation results
        </h1>
        <section className="card border-amber-200 bg-amber-50">
          <h2 className="text-lg font-medium text-amber-900 dark:text-amber-200">Budget too low</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
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

  // Budget breakdown: minimum payments vs the extra that's funnelled to the
  // priority debt. Based on the committed monthly budget (not the what-if slider).
  const totalMinimums = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  const extraPayment = Math.max(0, monthlyBudget - totalMinimums)
  const minimumsPct =
    monthlyBudget > 0 ? (totalMinimums / monthlyBudget) * 100 : 0
  const extraPct = monthlyBudget > 0 ? (extraPayment / monthlyBudget) * 100 : 0

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Simulation results
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Monthly budget: {formatCurrency(monthlyBudget)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveState === 'saved' && (
            <span className="text-sm font-medium text-green-600">
              Plan saved ✓
            </span>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowSave((v) => !v)
              setSaveState('idle')
            }}
          >
            Save this plan
          </button>
          <Link to="/debts" className="btn-ghost">
            ← Edit debts
          </Link>
        </div>
      </header>

      {showSave && (
        <section className="card flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            className="input sm:flex-1"
            placeholder="Plan name (e.g. Aggressive payoff)"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!planName.trim() || saveState === 'saving'}
              onClick={handleSavePlan}
            >
              {saveState === 'saving' ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowSave(false)
                setPlanName('')
              }}
            >
              Cancel
            </button>
          </div>
          {saveState === 'error' && (
            <span className="text-sm text-red-600">
              Could not save. Please try again.
            </span>
          )}
        </section>
      )}

      {/* What-If extra payment */}
      <section className="card">
        <div className="flex items-center justify-between">
          <label htmlFor="extra" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
            tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200"
            label="You'll be debt free"
            value={`${monthsSooner} ${monthsSooner === 1 ? 'month' : 'months'} sooner`}
          />
          <Callout
            icon={PiggyBank}
            tint="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-200"
            label="You'll save"
            value={`${formatCurrency(interestSavedByExtra)} in interest`}
          />
          <Callout
            icon={CalendarCheck}
            tint="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200"
            label="Debt free by"
            value={debtFreeBy}
          />
        </div>
      </section>

      {/* Lump sum calculator */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Applied to {lumpTargetTitle} (highest interest rate)
          </p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Callout
            icon={Clock}
            tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200"
            label="Months saved"
            value={`${lumpMonthsSaved} ${lumpMonthsSaved === 1 ? 'month' : 'months'}`}
          />
          <Callout
            icon={PiggyBank}
            tint="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-200"
            label="Interest saved"
            value={formatCurrency(lumpInterestSaved)}
          />
          <Callout
            icon={CalendarCheck}
            tint="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200"
            label="New debt free date"
            value={lumpDate}
          />
        </div>
      </section>

      {/* Winner banner */}
      <section className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-500/30 dark:bg-green-500/10">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
        <div>
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-200">
            {winnerName} is your best strategy
          </h2>
          <p className="mt-0.5 text-sm text-green-800 dark:text-green-200">
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

      {/* Monthly payment breakdown */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Monthly payment breakdown
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BudgetCard
            label="Minimum Payments"
            value={formatCurrency(totalMinimums)}
            subtitle="Required every month"
            valueClass="text-slate-900 dark:text-slate-100"
          />
          <BudgetCard
            label="Extra Payment"
            value={formatCurrency(extraPayment)}
            subtitle="Funneled to priority debt"
            valueClass={extraPayment > 0 ? 'text-green-600' : 'text-amber-600'}
          />
          <BudgetCard
            label="Total Monthly Budget"
            value={formatCurrency(monthlyBudget)}
            subtitle="Your committed amount"
            valueClass="text-primary-600"
          />
        </div>

        {/* Stacked bar: minimums (slate) vs extra (indigo) */}
        <div className="mt-5 flex h-8 w-full overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-700">
          {minimumsPct > 0 && (
            <div
              className="flex items-center justify-center bg-slate-400 text-xs font-medium text-white"
              style={{ width: `${minimumsPct}%` }}
            >
              {minimumsPct >= 12 && `Minimums ${Math.round(minimumsPct)}%`}
            </div>
          )}
          {extraPct > 0 && (
            <div
              className="flex items-center justify-center bg-primary-500 text-xs font-medium text-white"
              style={{ width: `${extraPct}%` }}
            >
              {extraPct >= 12 && `Extra ${Math.round(extraPct)}%`}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Minimum payments
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            Extra payment
          </span>
        </div>
      </section>

      {/* Per-debt breakdown by strategy */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StrategyBreakdown
          title="Avalanche Strategy"
          subtitle="Highest interest rate first"
          accentClass="text-green-700"
          bannerClass="border border-green-100 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200"
          rowHighlightClass="bg-green-50/60 dark:bg-green-500/10"
          priorityBorderColor="#16a34a"
          badgeClass="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
          bannerVariant="rate"
          result={avalanche}
          debts={debts}
          extraPayment={extraPayment}
          totalMinimums={totalMinimums}
          monthlyBudget={monthlyBudget}
        />
        <StrategyBreakdown
          title="Snowball Strategy"
          subtitle="Smallest balance first"
          accentClass="text-primary-700"
          bannerClass="border border-indigo-100 bg-indigo-50 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
          rowHighlightClass="bg-primary-50/60 dark:bg-primary-500/10"
          priorityBorderColor="#4f46e5"
          badgeClass="bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200"
          bannerVariant="balance"
          result={snowball}
          debts={debts}
          extraPayment={extraPayment}
          totalMinimums={totalMinimums}
          monthlyBudget={monthlyBudget}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2">
        {TABS.map((t) => (
          <span
            key={t.key}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200',
              t.key === tab
                ? 'w-5 bg-primary-600 dark:bg-primary-400'
                : 'w-1.5 bg-surface-300 dark:bg-slate-600',
            )}
          />
        ))}
      </div>

      {/* Swipeable tab content */}
      <div
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
          touchStartY.current = e.touches[0].clientY
        }}
        onTouchEnd={(e) => {
          const deltaX = e.changedTouches[0].clientX - touchStartX.current
          const deltaY = e.changedTouches[0].clientY - touchStartY.current
          // Only act on a dominant horizontal swipe of at least 60px.
          if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) {
            return
          }
          if (deltaX < 0 && tabIndex < TABS.length - 1) {
            changeTab(TABS[tabIndex + 1].key)
          } else if (deltaX > 0 && tabIndex > 0) {
            changeTab(TABS[tabIndex - 1].key)
          }
        }}
      >
        <div
          key={tab}
          className={slideDir === 'next' ? 'tab-slide-next' : 'tab-slide-prev'}
        >
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
        </div>
      </div>

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
      <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">{label}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{sub}</p>
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

function BudgetCard({
  label,
  value,
  subtitle,
  valueClass,
}: {
  label: string
  value: string
  subtitle: string
  valueClass: string
}) {
  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-slate-700 dark:bg-surface-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', valueClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  )
}

function StrategyBreakdown({
  title,
  subtitle,
  accentClass,
  bannerClass,
  rowHighlightClass,
  priorityBorderColor,
  badgeClass,
  bannerVariant,
  result,
  debts,
  extraPayment,
  totalMinimums,
  monthlyBudget,
}: {
  title: string
  subtitle: string
  accentClass: string
  bannerClass: string
  rowHighlightClass: string
  priorityBorderColor: string
  badgeClass: string
  bannerVariant: 'rate' | 'balance'
  result: SimulationResult
  debts: Debt[]
  extraPayment: number
  totalMinimums: number
  monthlyBudget: number
}) {
  const formatCurrency = useCurrencyFormatter()

  // The extra budget is funnelled entirely to the priority debt (first in this
  // strategy's payoff order); everyone else pays only their minimum.
  const payoffMonth = new Map(
    result.payoffOrder.map((p) => [p.debtId, p.monthsToPayoff]),
  )

  const active = debts.filter((d) => d.balance > 0)
  // Priority order the extra cascades through, matching the engine's monthly
  // funnel: Avalanche → highest rate first, Snowball → smallest balance first.
  const priorityOrder = [...active].sort((a, b) =>
    bannerVariant === 'rate'
      ? b.interestRate - a.interestRate
      : a.balance - b.balance,
  )
  // Cascade the extra budget down the priority list, capping each debt at the
  // balance still owed after its minimum; leftover rolls to the next debt.
  const extraByDebt = new Map<string, number>()
  let remainingExtra = extraPayment
  for (const d of priorityOrder) {
    if (remainingExtra <= 0) break
    const minPaid = Math.min(d.monthlyPayment, d.balance)
    const room = Math.max(0, d.balance - minPaid)
    const applied = Math.min(remainingExtra, room)
    if (applied > 0) {
      extraByDebt.set(d.id, applied)
      remainingExtra -= applied
    }
  }
  const appliedExtra = extraPayment - remainingExtra
  const priorityId = priorityOrder.find((d) => extraByDebt.has(d.id))?.id ?? null
  const priorityDebt = debts.find((d) => d.id === priorityId) ?? null

  const rows = debts
    .map((d, i) => ({ debt: d, color: DEBT_COLORS[i % DEBT_COLORS.length] }))
    .filter(({ debt }) => debt.balance > 0)
    .map(({ debt, color }) => {
      const extra = extraByDebt.get(debt.id) ?? 0
      return {
        id: debt.id,
        name: debt.title,
        color,
        minimum: debt.monthlyPayment,
        extra,
        total: debt.monthlyPayment + extra,
        month: payoffMonth.get(debt.id) ?? null,
      }
    })

  const bannerDetail = priorityDebt
    ? bannerVariant === 'rate'
      ? `${priorityDebt.interestRate}% APR`
      : `${formatCurrency(priorityDebt.balance)} balance`
    : ''

  return (
    <section className="card">
      <h2 className={cn('text-lg font-semibold', accentClass)}>{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>

      {priorityDebt && extraPayment > 0 && (
        <div className={cn('mt-4 rounded-lg px-4 py-3 text-sm', bannerClass)}>
          💡 Extra {formatCurrency(extraPayment)} concentrated on{' '}
          {priorityDebt.title} ({bannerDetail})
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 pr-4 font-medium">Debt</th>
              <th className="py-2 pr-4 font-medium text-right">Minimum</th>
              <th className="py-2 pr-4 font-medium text-right">Extra</th>
              <th className="py-2 pr-4 font-medium text-right">Total monthly</th>
              <th className="py-2 pr-4 font-medium text-right">Payoff date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPriority = row.id === priorityId && extraPayment > 0
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-surface-100 last:border-0 dark:border-slate-700',
                    isPriority && rowHighlightClass,
                  )}
                >
                  <td
                    className="border-l-4 py-3 pl-3 pr-4 font-medium text-slate-900 dark:text-slate-100"
                    style={{
                      borderLeftColor: isPriority
                        ? priorityBorderColor
                        : row.color,
                    }}
                  >
                    {row.name}
                    {isPriority && (
                      <span
                        className={cn(
                          'ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          badgeClass,
                        )}
                      >
                        Focus
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700 dark:text-slate-300">
                    {formatCurrency(row.minimum)}
                  </td>
                  <td
                    className={cn(
                      'py-3 pr-4 text-right',
                      row.extra > 0
                        ? 'font-medium text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-400',
                    )}
                  >
                    {formatCurrency(row.extra)}
                  </td>
                  <td className="py-3 pr-4 text-right font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700 dark:text-slate-300">
                    {row.month != null ? payoffMonthLabel(row.month) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-200 font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
              <td className="py-3 pr-4">Total</td>
              <td className="py-3 pr-4 text-right">
                {formatCurrency(totalMinimums)}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCurrency(appliedExtra)}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCurrency(monthlyBudget)}
              </td>
              <td className="py-3 pr-4" />
            </tr>
          </tfoot>
        </table>
      </div>
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
      <dt className="text-sm text-slate-600 dark:text-slate-300">{term}</dt>
      <dd className="flex items-center gap-2">
        <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        {win && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-200">
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
    <div className="flex items-center gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-700">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tint,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
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
      <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
        Total Debt Over Time
      </h2>
      <div className="h-[200px] sm:h-72">
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
      <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
        {label} — payoff order
      </h2>
      <ol className="space-y-2">
        {result.payoffOrder.map((p) => {
          const totalCost = (balanceById[p.debtId] ?? 0) + p.interestPaid
          return (
            <li key={p.debtId} className="rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-700">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
                    {p.payoffOrder}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{p.title}</span>
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {formatMonthsWithDate(p.monthsToPayoff)}
                </span>
              </div>
              <p className="mt-1 pl-8 text-xs text-slate-500 dark:text-slate-400">
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
      <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
        Remaining balance by month
      </h2>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white dark:bg-surface-800">
            <tr className="border-b border-surface-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 pr-4 font-medium">Month</th>
              <th className="py-2 pr-4 font-medium">Snowball balance</th>
              <th className="py-2 pr-4 font-medium">Avalanche balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.month}
                className="border-b border-surface-100 last:border-0 dark:border-slate-700"
              >
                <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{r.month}</td>
                <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                  {formatCurrency(r.snowball)}
                </td>
                <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
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
