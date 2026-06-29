import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarCheck,
  type LucideIcon,
  Percent,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { runAvalanche, runSnowball } from '@/utils/simulate'
import { formatPercent, useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'

const DEBT_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
]
const EXTRA_COLOR = '#cbd5e1' // slate-300
const SNOWBALL_COLOR = '#6366f1' // indigo
const AVALANCHE_COLOR = '#22c55e' // green

/** Format a month offset from today as "August 2028". */
function monthYearFromNow(months: number): string | null {
  if (!Number.isFinite(months)) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  payload?: { fill?: string }
}

/** Recharts tooltip styled for both light and dark mode. */
function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  formatValue: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-600 dark:bg-slate-800">
      {label !== undefined && label !== '' && (
        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p
          key={i}
          className="text-sm font-medium"
          style={{ color: entry.color ?? entry.payload?.fill }}
        >
          {entry.name}: {formatValue(Number(entry.value))}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const debts = useDebtStore((s) => s.debts)
  const monthlyBudget = useDebtStore((s) => s.monthlyBudget)
  const formatCurrency = useCurrencyFormatter()

  const analytics = useMemo(() => {
    const active = debts.filter((d) => d.balance > 0)
    const activeMinimums = active.reduce((sum, d) => sum + d.monthlyPayment, 0)

    // Minimums-only run: budget == active minimums, so nothing extra is
    // funnelled — each debt's interestPaid is its cost under minimum payments.
    const minimumsOnly = runAvalanche({ debts, monthlyBudget: activeMinimums })
    const snowball = runSnowball({ debts, monthlyBudget })
    const avalanche = runAvalanche({ debts, monthlyBudget })

    const interestByDebt = new Map<string, number>()
    for (const p of minimumsOnly.payoffOrder) {
      interestByDebt.set(p.debtId, p.interestPaid)
    }
    const snowballMonth = new Map<string, number>()
    for (const p of snowball.payoffOrder) {
      snowballMonth.set(p.debtId, p.monthsToPayoff)
    }
    const avalancheMonth = new Map<string, number>()
    for (const p of avalanche.payoffOrder) {
      avalancheMonth.set(p.debtId, p.monthsToPayoff)
    }

    const totalDebt = active.reduce((sum, d) => sum + d.balance, 0)
    const weightedRate =
      totalDebt > 0
        ? active.reduce((sum, d) => sum + d.balance * d.interestRate, 0) /
          totalDebt
        : 0
    const highest =
      active.length > 0
        ? active.reduce((a, b) => (b.interestRate > a.interestRate ? b : a))
        : null

    // Interest breakdown — one bar per debt, highest first.
    const interestData = active
      .map((d) => ({ name: d.title, interest: interestByDebt.get(d.id) ?? 0 }))
      .sort((a, b) => b.interest - a.interest)
      .map((d, i) => ({ ...d, fill: DEBT_COLORS[i % DEBT_COLORS.length] }))

    // Payoff timeline — only meaningful when both plans are affordable.
    const plansAffordable = !snowball.unaffordable && !avalanche.unaffordable
    const timelineData = plansAffordable
      ? active.map((d) => ({
          name: d.title,
          Snowball: snowballMonth.get(d.id) ?? 0,
          Avalanche: avalancheMonth.get(d.id) ?? 0,
        }))
      : []

    // Monthly payment split — each debt's minimum plus any leftover buffer.
    const extra = monthlyBudget - activeMinimums
    const pieData = active.map((d, i) => ({
      name: d.title,
      value: d.monthlyPayment,
      fill: DEBT_COLORS[i % DEBT_COLORS.length],
    }))
    if (extra > 0) {
      pieData.push({ name: 'Extra', value: extra, fill: EXTRA_COLOR })
    }

    // Cost of debt — sorted by interest/balance ratio, descending.
    const costRows = active
      .map((d) => {
        const interest = interestByDebt.get(d.id) ?? 0
        return {
          id: d.id,
          name: d.title,
          balance: d.balance,
          interest,
          trueCost: d.balance + interest,
          ratio: d.balance > 0 ? (interest / d.balance) * 100 : 0,
        }
      })
      .sort((a, b) => b.ratio - a.ratio)

    return {
      active,
      totalDebt,
      weightedRate,
      highest,
      avalancheDate: monthYearFromNow(avalanche.monthsToPayoff),
      interestData,
      timelineData,
      plansAffordable,
      pieData,
      costRows,
    }
  }, [debts, monthlyBudget])

  if (analytics.active.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Analytics</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Insights into the true cost of your debt.
          </p>
        </header>
        <section className="card">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Nothing to analyze yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Add a debt and a monthly budget to unlock your analytics.
          </p>
          <Link to="/debts" className="btn-primary mt-4 inline-block">
            Go to debts
          </Link>
        </section>
      </div>
    )
  }

  const {
    totalDebt,
    weightedRate,
    highest,
    avalancheDate,
    interestData,
    timelineData,
    plansAffordable,
    pieData,
    costRows,
  } = analytics

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Insights into the true cost of your debt.
        </p>
      </header>

      {/* 1. Summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
          label="Total debt"
          value={formatCurrency(totalDebt)}
        />
        <StatCard
          icon={Percent}
          tint="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
          label="Avg interest (weighted)"
          value={formatPercent(weightedRate)}
        />
        <StatCard
          icon={TrendingUp}
          tint="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
          label="Highest interest debt"
          value={highest ? highest.title : '—'}
          sub={highest ? formatPercent(highest.interestRate) : undefined}
        />
        <StatCard
          icon={CalendarCheck}
          tint="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
          label="Debt-free by (Avalanche)"
          value={avalancheDate ?? '—'}
          sub={avalancheDate ? undefined : 'Budget too low'}
        />
      </div>

      {/* 2. Interest breakdown */}
      <section className="card">
        <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">
          Interest breakdown
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Total interest each debt accrues if paid with minimum payments only.
        </p>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={interestData}
              layout="vertical"
              margin={{ top: 8, right: 32, left: 16, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                strokeOpacity={0.3}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={false}
                content={<CustomTooltip formatValue={formatCurrency} />}
              />
              <Bar
                dataKey="interest"
                radius={[0, 4, 4, 0]}
                maxBarSize={40}
                background={{ fill: 'transparent' }}
              >
                {interestData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. Debt payoff timeline */}
      <section className="card">
        <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">
          Debt payoff timeline
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Month each debt is cleared — Snowball vs Avalanche.
        </p>
        {plansAffordable ? (
          <div className="h-[260px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timelineData}
                margin={{ top: 8, right: 16, left: 8, bottom: 24 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    v.length > 8 ? `${v.slice(0, 8).trim()}.` : v
                  }
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                  tickFormatter={(v) => `M${v}`}
                />
                <Tooltip
                  cursor={false}
                  content={<CustomTooltip formatValue={(v) => `Month ${v}`} />}
                />
                <Legend />
                <Bar
                  dataKey="Snowball"
                  fill={SNOWBALL_COLOR}
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
                <Bar
                  dataKey="Avalanche"
                  fill={AVALANCHE_COLOR}
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Your monthly budget doesn't cover the minimum payments, so a payoff
            timeline can't be projected. Increase your budget on the debts page.
          </p>
        )}
      </section>

      {/* 4. Monthly payment breakdown */}
      <section className="card">
        <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">
          Monthly payment breakdown
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          How your monthly budget splits across debts, with any leftover buffer.
        </p>
        <div className="h-[200px] overflow-hidden sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                content={<CustomTooltip formatValue={formatCurrency} />}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend — stacks vertically on mobile, wraps on larger screens */}
        <ul className="mt-4 flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:gap-x-4">
          {pieData.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: d.fill }}
              />
              <span className="text-slate-600 dark:text-slate-300">
                {d.name}
              </span>
              <span className="ml-auto font-medium text-slate-900 sm:ml-1 dark:text-slate-100">
                {formatCurrency(d.value)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Cost of debt table */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Cost of debt
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Debt</th>
                <th className="py-2 pr-4 font-medium">Balance</th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">
                  Total interest
                </th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">
                  True cost
                </th>
                <th className="hidden py-2 pr-4 font-medium text-right md:table-cell">
                  Cost ratio
                </th>
              </tr>
            </thead>
            <tbody>
              {costRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-surface-100 last:border-0 dark:border-slate-700',
                    row.ratio > 50 && 'bg-amber-50 dark:bg-amber-500/10',
                  )}
                >
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    {row.name}
                  </td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                    {formatCurrency(row.balance)}
                  </td>
                  <td className="hidden py-3 pr-4 text-slate-700 md:table-cell dark:text-slate-300">
                    {formatCurrency(row.interest)}
                  </td>
                  <td className="hidden py-3 pr-4 text-slate-700 md:table-cell dark:text-slate-300">
                    {formatCurrency(row.trueCost)}
                  </td>
                  <td
                    className={cn(
                      'hidden py-3 pr-4 text-right font-medium md:table-cell',
                      row.ratio > 50 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {formatPercent(row.ratio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: LucideIcon
  tint: string
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="card flex items-start gap-3">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          tint,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}
