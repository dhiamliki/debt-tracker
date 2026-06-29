import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, Repeat, Snowflake, Trash2 } from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { runAvalanche } from '@/utils/simulate'
import { useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Debt } from '@/types/debt'
import type { SimulationResult } from '@/types/simulation'

const plural = (n: number) => (n === 1 ? 'month' : 'months')
const moLabel = (m: number) => (Number.isFinite(m) ? `${m} mo` : '—')

function debtFreeDate(months: number): string {
  if (!Number.isFinite(months)) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** Highest-interest debt id among those with a balance ("auto" target). */
function highestRateId(debts: Debt[]): string {
  const open = debts.filter((d) => d.balance > 0)
  if (open.length === 0) return ''
  return open.reduce((a, b) => (b.interestRate > a.interestRate ? b : a)).id
}

/** Return debts with `amount` subtracted from `targetId`'s balance. */
function applyLump(debts: Debt[], targetId: string, amount: number): Debt[] {
  if (amount <= 0 || !targetId) return debts
  return debts.map((d) =>
    d.id === targetId ? { ...d, balance: Math.max(0, d.balance - amount) } : d,
  )
}

export default function ExtraPaymentsPage() {
  const debts = useDebtStore((s) => s.debts)
  const storeBudget = useDebtStore((s) => s.monthlyBudget)
  const fmt = useCurrencyFormatter()

  const active = debts.filter((d) => d.balance > 0)
  const totalMinimums = active.reduce((s, d) => s + d.monthlyPayment, 0)
  const baselineBudget = Math.max(storeBudget, totalMinimums)
  const autoId = highestRateId(debts)

  // Controls
  const [extra, setExtra] = useState(0)
  const [lumpSum, setLumpSum] = useState(0)
  const [lumpTarget, setLumpTarget] = useState('auto')
  const [snowAmount, setSnowAmount] = useState('')
  const [snowLabel, setSnowLabel] = useState('')
  const [snowflakes, setSnowflakes] = useState<
    { id: string; amount: number; label: string }[]
  >([])

  const baseline = useMemo(
    () => runAvalanche({ debts, monthlyBudget: baselineBudget }),
    [debts, baselineBudget],
  )

  // Section 1 — recurring extra
  const recurring = useMemo(
    () => runAvalanche({ debts, monthlyBudget: baselineBudget + extra }),
    [debts, baselineBudget, extra],
  )
  const milestones = useMemo(
    () =>
      [50, 100, 150, 200, 250, 300].map((amt) => {
        const r = runAvalanche({ debts, monthlyBudget: baselineBudget + amt })
        return {
          amt,
          totalBudget: baselineBudget + amt,
          months: r.monthsToPayoff,
          interest: r.totalInterestPaid,
          saved: baseline.monthsToPayoff - r.monthsToPayoff,
          unaffordable: r.unaffordable,
        }
      }),
    [debts, baselineBudget, baseline],
  )

  // Section 2 — lump sum
  const lumpTargetId = lumpTarget === 'auto' ? autoId : lumpTarget
  const lumpResult = useMemo(
    () =>
      runAvalanche({
        debts: applyLump(debts, lumpTargetId, lumpSum),
        monthlyBudget: baselineBudget,
      }),
    [debts, lumpTargetId, lumpSum, baselineBudget],
  )
  const lumpTargetDebt = debts.find((d) => d.id === lumpTargetId) ?? null

  // Section 3 — snowflakes (combined total applied to the best debt)
  const snowTotal = snowflakes.reduce((s, p) => s + p.amount, 0)
  const snowResult = useMemo(
    () =>
      runAvalanche({
        debts: applyLump(debts, autoId, snowTotal),
        monthlyBudget: baselineBudget,
      }),
    [debts, autoId, snowTotal, baselineBudget],
  )

  const addSnowflake = () => {
    const amount = Number(snowAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    setSnowflakes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), amount, label: snowLabel.trim() || 'Snowflake' },
    ])
    setSnowAmount('')
    setSnowLabel('')
  }

  if (active.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <section className="card">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Nothing to pay down yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Add a debt and a monthly budget to explore extra payments.
          </p>
          <Link to="/debts" className="btn-primary mt-4 inline-block">
            Go to debts
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* SECTION 1 — Recurring extra */}
      <section className="card">
        <SectionTitle
          icon={Repeat}
          title="Recurring extra payment"
          subtitle="Add a fixed extra amount every month."
        />
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Extra per month
          </span>
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {fmt(extra)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="mt-2 w-full accent-primary-600"
        />

        <ImpactGrid base={baseline} scen={recurring} fmt={fmt} />

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Extra/mo</th>
                <th className="py-2 pr-4 font-medium">Total budget</th>
                <th className="py-2 pr-4 font-medium">Months to payoff</th>
                <th className="py-2 pr-4 font-medium">Interest paid</th>
                <th className="py-2 pr-4 font-medium text-right">Months saved</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr
                  key={m.amt}
                  className="border-b border-surface-100 last:border-0 dark:border-slate-700"
                >
                  <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    {fmt(m.amt)}
                  </td>
                  <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                    {fmt(m.totalBudget)}
                  </td>
                  <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                    {moLabel(m.months)}
                  </td>
                  <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                    {m.unaffordable ? '—' : fmt(m.interest)}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium text-green-600 dark:text-green-400">
                    {m.unaffordable || m.saved <= 0
                      ? '—'
                      : `${m.saved} ${plural(m.saved)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2 — Lump sum */}
      <section className="card">
        <SectionTitle
          icon={Coins}
          title="One-time lump sum payment"
          subtitle="Make a single extra payment toward one debt."
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
            className="input sm:w-56"
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

        {lumpSum > 0 && lumpTargetDebt && (
          <p className="mt-3 rounded-lg bg-surface-50 px-3 py-2 text-sm text-slate-600 dark:bg-surface-700 dark:text-slate-300">
            Applied {fmt(Math.min(lumpSum, lumpTargetDebt.balance))} to{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {lumpTargetDebt.title}
            </span>{' '}
            — new balance:{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {fmt(Math.max(0, lumpTargetDebt.balance - lumpSum))}
            </span>
            {lumpTarget === 'auto' && ' (highest interest rate)'}
          </p>
        )}

        <ImpactGrid base={baseline} scen={lumpResult} fmt={fmt} />
      </section>

      {/* SECTION 3 — Snowflakes */}
      <section className="card">
        <SectionTitle
          icon={Snowflake}
          title="Snowflake payments"
          subtitle="Log small, irregular extra payments — cashback, refunds, side income."
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min={0}
            step={10}
            placeholder="Amount"
            value={snowAmount}
            onChange={(e) => setSnowAmount(e.target.value)}
            className="input sm:w-40"
          />
          <input
            type="text"
            placeholder="Label (e.g. Tax refund)"
            value={snowLabel}
            onChange={(e) => setSnowLabel(e.target.value)}
            className="input sm:flex-1"
          />
          <button
            type="button"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!(Number(snowAmount) > 0)}
            onClick={addSnowflake}
          >
            Add payment
          </button>
        </div>

        {snowflakes.length > 0 && (
          <div className="mt-4">
            <ul className="divide-y divide-surface-100 dark:divide-slate-700">
              {snowflakes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {s.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {fmt(s.amount)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${s.label}`}
                      onClick={() =>
                        setSnowflakes((prev) =>
                          prev.filter((p) => p.id !== s.id),
                        )
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-surface-200 pt-2 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Total snowflakes
              </span>
              <span className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {fmt(snowTotal)}
                </span>
                <button
                  type="button"
                  onClick={() => setSnowflakes([])}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Clear all
                </button>
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Combined, these are applied to your highest-interest debt.
            </p>
            <ImpactGrid base={baseline} scen={snowResult} fmt={fmt} />
          </div>
        )}

        {snowflakes.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Add a few snowflake payments to see their combined impact.
          </p>
        )}
      </section>
    </div>
  )
}

function Header() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Extra Payments
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        See how paying more — regularly or in one go — accelerates your payoff.
      </p>
    </header>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Repeat
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function ImpactGrid({
  base,
  scen,
  fmt,
}: {
  base: SimulationResult
  scen: SimulationResult
  fmt: (value: number) => string
}) {
  const comparable =
    Number.isFinite(base.monthsToPayoff) && !scen.unaffordable
  const monthsSaved = base.monthsToPayoff - scen.monthsToPayoff
  const interestSaved = base.totalInterestPaid - scen.totalInterestPaid
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Delta
        label="Months saved"
        ok={comparable}
        positive={monthsSaved > 0}
        text={
          !comparable
            ? '—'
            : monthsSaved > 0
              ? `${monthsSaved} ${plural(monthsSaved)} sooner`
              : 'No change'
        }
      />
      <Delta
        label="Interest saved"
        ok={comparable}
        positive={interestSaved > 0}
        text={
          !comparable
            ? '—'
            : interestSaved > 0
              ? fmt(interestSaved)
              : 'No change'
        }
      />
      <Delta
        label="New debt-free date"
        ok={!scen.unaffordable}
        text={debtFreeDate(scen.monthsToPayoff)}
      />
    </div>
  )
}

function Delta({
  label,
  text,
  ok,
  positive,
}: {
  label: string
  text: string
  ok: boolean
  positive?: boolean
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
              : 'text-slate-900 dark:text-slate-100',
        )}
      >
        {text}
      </p>
    </div>
  )
}
