import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDebtStore } from '@/store/debtStore'
import { runAvalanche, runSnowball } from '@/utils/simulate'
import { useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { SimulationResult } from '@/types/simulation'

const SCENARIO_COLOR = '#6366f1' // indigo
const BASELINE_COLOR = '#94a3b8' // slate-400

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
const plural = (n: number) => (n === 1 ? 'month' : 'months')
const moLabel = (m: number) => (Number.isFinite(m) ? `${m} mo` : '—')

/** Projected debt-free month as "Aug 2028", counted from today. */
function debtFreeDate(months: number): string {
  if (!Number.isFinite(months)) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function WhatIfSimulatorPage() {
  const debts = useDebtStore((s) => s.debts)
  const storeBudget = useDebtStore((s) => s.monthlyBudget)
  const fmt = useCurrencyFormatter()

  const allMinimums = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  const sliderMin = allMinimums
  const sliderMax = allMinimums * 3
  const baselineBudget = Math.max(storeBudget, allMinimums)

  // Scenario controls
  const [scenarioBudget, setScenarioBudget] = useState(() =>
    clamp(baselineBudget, sliderMin, sliderMax || baselineBudget),
  )
  const [lumpSum, setLumpSum] = useState(0)
  const [lumpTarget, setLumpTarget] = useState('auto')
  const [includes, setIncludes] = useState<Record<string, boolean>>({})
  const [rateOverrides, setRateOverrides] = useState<Record<string, number>>({})

  const reset = () => {
    setScenarioBudget(clamp(baselineBudget, sliderMin, sliderMax || baselineBudget))
    setLumpSum(0)
    setLumpTarget('auto')
    setIncludes({})
    setRateOverrides({})
  }

  const baseline = useMemo(
    () => ({
      snowball: runSnowball({ debts, monthlyBudget: baselineBudget }),
      avalanche: runAvalanche({ debts, monthlyBudget: baselineBudget }),
    }),
    [debts, baselineBudget],
  )

  const scenario = useMemo(() => {
    const included = debts
      .filter((d) => includes[d.id] !== false)
      .map((d) => ({
        ...d,
        interestRate: rateOverrides[d.id] ?? d.interestRate,
      }))

    let targetId = lumpTarget
    if (targetId === 'auto') {
      const open = included.filter((d) => d.balance > 0)
      targetId = open.length
        ? open.reduce((a, b) => (b.interestRate > a.interestRate ? b : a)).id
        : ''
    }

    const scenarioDebts = included.map((d) =>
      d.id === targetId && lumpSum > 0
        ? { ...d, balance: Math.max(0, d.balance - lumpSum) }
        : d,
    )

    return {
      targetId,
      snowball: runSnowball({ debts: scenarioDebts, monthlyBudget: scenarioBudget }),
      avalanche: runAvalanche({ debts: scenarioDebts, monthlyBudget: scenarioBudget }),
    }
  }, [debts, includes, rateOverrides, lumpTarget, lumpSum, scenarioBudget])

  const chartData = useMemo(() => {
    const b = baseline.avalanche.snapshots
    const s = scenario.avalanche.snapshots
    const n = Math.max(b.length, s.length)
    return Array.from({ length: n }, (_, i) => ({
      month: i + 1,
      baseline: b[i]?.totalBalance ?? 0,
      scenario: s[i]?.totalBalance ?? 0,
    }))
  }, [baseline, scenario])

  if (debts.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            What-If Simulator
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Explore scenarios against your current plan.
          </p>
        </header>
        <section className="card">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Nothing to simulate yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Add a debt and a monthly budget to start exploring what-if
            scenarios.
          </p>
          <Link to="/debts" className="btn-primary mt-4 inline-block">
            Go to debts
          </Link>
        </section>
      </div>
    )
  }

  const baseAv = baseline.avalanche
  const scenAv = scenario.avalanche
  const comparable =
    Number.isFinite(baseAv.monthsToPayoff) && !scenAv.unaffordable
  const monthsSaved = baseAv.monthsToPayoff - scenAv.monthsToPayoff
  const interestSaved = baseAv.totalInterestPaid - scenAv.totalInterestPaid
  const extra = scenarioBudget - allMinimums

  const targetTitle =
    debts.find((d) => d.id === scenario.targetId)?.title ?? null

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            What-If Simulator
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Tweak the controls and see how your payoff changes — instantly.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to current
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* CONTROLS */}
        <div className="space-y-6 lg:col-span-2">
          {/* Budget slider */}
          <section className="card">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Monthly budget
              </h2>
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {fmt(scenarioBudget)}
              </span>
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax || sliderMin + 1}
              step={10}
              value={scenarioBudget}
              onChange={(e) => setScenarioBudget(Number(e.target.value))}
              className="mt-3 w-full accent-primary-600"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Extra: {fmt(Math.max(0, extra))} above minimums
            </p>
          </section>

          {/* Lump sum */}
          <section className="card">
            <h2 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              One-time lump sum
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                min={0}
                step={50}
                placeholder="0"
                value={lumpSum || ''}
                onChange={(e) => setLumpSum(Number(e.target.value) || 0)}
                className="input sm:flex-1"
              />
              <select
                className="input sm:w-44"
                value={lumpTarget}
                onChange={(e) => setLumpTarget(e.target.value)}
              >
                <option value="auto">Best — auto</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            {lumpSum > 0 && lumpTarget === 'auto' && targetTitle && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Applied to {targetTitle} (highest interest rate)
              </p>
            )}
          </section>

          {/* Per-debt: include toggle + interest rate adjuster */}
          <section className="card">
            <h2 className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Debts & rates
            </h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Toggle a debt off to exclude it, or adjust its rate (e.g. a 0%
              balance transfer).
            </p>
            <div className="divide-y divide-surface-100 dark:divide-slate-700">
              {debts.map((d) => {
                const included = includes[d.id] !== false
                const rate = rateOverrides[d.id] ?? d.interestRate
                const setRate = (v: number) =>
                  setRateOverrides((prev) => ({
                    ...prev,
                    [d.id]: clamp(Number(v.toFixed(2)), 0, 100),
                  }))
                return (
                  <div key={d.id} className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() =>
                        setIncludes((prev) => ({ ...prev, [d.id]: !included }))
                      }
                      className="h-4 w-4 shrink-0 accent-primary-600"
                      aria-label={`Include ${d.title}`}
                    />
                    <span
                      className={cn(
                        'flex-1 truncate text-sm',
                        included
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400 line-through dark:text-slate-500',
                      )}
                    >
                      {d.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Lower rate"
                        disabled={!included}
                        onClick={() => setRate(rate - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-200 text-slate-500 hover:bg-surface-100 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-surface-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={!included}
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="input w-16 px-1 py-1 text-center text-sm disabled:opacity-40"
                      />
                      <button
                        type="button"
                        aria-label="Raise rate"
                        disabled={!included}
                        onClick={() => setRate(rate + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-200 text-slate-500 hover:bg-surface-100 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-surface-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* RESULTS */}
        <div className="space-y-6 lg:col-span-3">
          {/* Comparison vs baseline */}
          <section className="card">
            <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Impact vs your current plan
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Delta
                label="Time"
                ok={comparable}
                positive={monthsSaved > 0}
                negative={monthsSaved < 0}
                text={
                  !comparable
                    ? 'Can’t pay off'
                    : monthsSaved === 0
                      ? 'No change'
                      : `${Math.abs(monthsSaved)} ${plural(Math.abs(monthsSaved))} ${monthsSaved > 0 ? 'sooner' : 'later'}`
                }
              />
              <Delta
                label="Interest"
                ok={comparable}
                positive={interestSaved > 0}
                negative={interestSaved < 0}
                text={
                  !comparable
                    ? '—'
                    : interestSaved === 0
                      ? 'No change'
                      : `${fmt(Math.abs(interestSaved))} ${interestSaved > 0 ? 'saved' : 'more'}`
                }
              />
              <Delta
                label="New debt-free date"
                ok={!scenAv.unaffordable}
                text={debtFreeDate(scenAv.monthsToPayoff)}
              />
            </div>
          </section>

          {/* Baseline vs scenario, per strategy */}
          <section className="card">
            <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Baseline vs scenario
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CompareBlock
                label="Avalanche"
                base={baseline.avalanche}
                scen={scenario.avalanche}
                fmt={fmt}
              />
              <CompareBlock
                label="Snowball"
                base={baseline.snowball}
                scen={scenario.snowball}
                fmt={fmt}
              />
            </div>
          </section>

          {/* Chart */}
          <section className="card">
            <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Total debt over time
            </h2>
            <div className="h-[200px] sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    strokeOpacity={0.3}
                  />
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
                    cursor={false}
                    formatter={(v) => fmt(Number(v))}
                    labelFormatter={(m) => `Month ${m}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline"
                    stroke={BASELINE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="scenario"
                    name="Scenario"
                    stroke={SCENARIO_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Scenario payoff order */}
          <section className="card">
            <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              Scenario payoff order (Avalanche)
            </h2>
            {scenAv.unaffordable || scenAv.payoffOrder.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This scenario doesn’t pay off the debts — raise the budget or
                lower a rate.
              </p>
            ) : (
              <ol className="space-y-2">
                {scenAv.payoffOrder.map((p) => (
                  <li
                    key={p.debtId}
                    className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-700"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
                        {p.payoffOrder}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {p.title}
                      </span>
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Month {p.monthsToPayoff} · {fmt(p.interestPaid)} interest
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Delta({
  label,
  text,
  ok,
  positive,
  negative,
}: {
  label: string
  text: string
  ok: boolean
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold',
          !ok
            ? 'text-slate-400 dark:text-slate-500'
            : positive
              ? 'text-green-600 dark:text-green-400'
              : negative
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-slate-100',
        )}
      >
        {text}
      </p>
    </div>
  )
}

function CompareBlock({
  label,
  base,
  scen,
  fmt,
}: {
  label: string
  base: SimulationResult
  scen: SimulationResult
  fmt: (value: number) => string
}) {
  const money = (v: number) => (Number.isFinite(v) ? fmt(v) : '—')
  const date = (r: SimulationResult) =>
    r.unaffordable ? '—' : debtFreeDate(r.monthsToPayoff)
  return (
    <div className="rounded-lg border border-surface-200 p-3 dark:border-slate-700">
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </h3>
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-sm">
        <div />
        <div className="text-xs font-medium text-slate-400">Baseline</div>
        <div className="text-xs font-medium text-slate-400">Scenario</div>

        <div className="text-slate-500 dark:text-slate-400">Interest</div>
        <div className="text-slate-800 dark:text-slate-200">
          {money(base.totalInterestPaid)}
        </div>
        <div className="text-slate-800 dark:text-slate-200">
          {money(scen.totalInterestPaid)}
        </div>

        <div className="text-slate-500 dark:text-slate-400">Months</div>
        <div className="text-slate-800 dark:text-slate-200">
          {moLabel(base.monthsToPayoff)}
        </div>
        <div className="text-slate-800 dark:text-slate-200">
          {moLabel(scen.monthsToPayoff)}
        </div>

        <div className="text-slate-500 dark:text-slate-400">Debt-free</div>
        <div className="text-slate-800 dark:text-slate-200">{date(base)}</div>
        <div className="text-slate-800 dark:text-slate-200">{date(scen)}</div>
      </div>
    </div>
  )
}
