import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  Flame,
  Layers,
  type LucideIcon,
  Repeat,
  Rocket,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { runAvalanche, runSnowball } from '@/utils/simulate'
import { formatPercent, useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'

type Tone = 'good' | 'warning' | 'danger' | 'info'

interface Rec {
  id: string
  tone: Tone
  icon: LucideIcon
  title: string
  description: string
  link?: { to: string; label: string }
}

const TONE: Record<Tone, { border: string; icon: string }> = {
  good: {
    border: 'border-l-green-500',
    icon: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300',
  },
  warning: {
    border: 'border-l-amber-500',
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  },
  danger: {
    border: 'border-l-red-500',
    icon: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
  },
  info: {
    border: 'border-l-indigo-500',
    icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
  },
}

/** Smallest monthly budget that clears all debts within `target` months. */
function minBudgetForMonths(
  debts: Parameters<typeof runAvalanche>[0]['debts'],
  minimum: number,
  totalDebt: number,
  target: number,
): number | null {
  let lo = minimum
  let hi = minimum + totalDebt + 1
  const top = runAvalanche({ debts, monthlyBudget: hi })
  if (top.unaffordable || top.monthsToPayoff > target) return null
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const r = runAvalanche({ debts, monthlyBudget: mid })
    if (!r.unaffordable && r.monthsToPayoff <= target) hi = mid
    else lo = mid
  }
  return Math.ceil(hi / 10) * 10
}

const plural = (n: number) => (n === 1 ? 'month' : 'months')

export default function RecommendationsPage() {
  const debts = useDebtStore((s) => s.debts)
  const monthlyBudget = useDebtStore((s) => s.monthlyBudget)
  const monthlyIncome = useDebtStore((s) => s.monthlyIncome)
  const fmt = useCurrencyFormatter()

  const { strategy, warnings, budget, tips, hasDebts } = useMemo(() => {
    const active = debts.filter((d) => d.balance > 0)
    const totalMinimums = active.reduce((s, d) => s + d.monthlyPayment, 0)
    const totalDebt = active.reduce((s, d) => s + d.balance, 0)
    const snowball = runSnowball({ debts, monthlyBudget })
    const avalanche = runAvalanche({ debts, monthlyBudget })
    const affordable =
      active.length > 0 && !snowball.unaffordable && !avalanche.unaffordable

    const strategy: Rec[] = []
    const warnings: Rec[] = []
    const budget: Rec[] = []
    const tips: Rec[] = []

    // STRATEGY (always shown when there are debts)
    if (active.length > 0) {
      if (affordable) {
        const cheaper =
          avalanche.totalInterestPaid <= snowball.totalInterestPaid
            ? 'Avalanche'
            : 'Snowball'
        const interestDelta = Math.abs(
          snowball.totalInterestPaid - avalanche.totalInterestPaid,
        )
        const faster =
          avalanche.monthsToPayoff <= snowball.monthsToPayoff
            ? 'Avalanche'
            : 'Snowball'
        const monthsDelta = Math.abs(
          snowball.monthsToPayoff - avalanche.monthsToPayoff,
        )
        let verdict: string
        if (interestDelta < 0.01 && monthsDelta === 0) {
          verdict =
            'Both strategies perform identically with your current budget — pick whichever keeps you motivated.'
        } else if (cheaper === faster) {
          verdict = `${cheaper} wins on both fronts — it saves you ${fmt(interestDelta)} in interest and clears your debt ${monthsDelta} ${plural(monthsDelta)} sooner.`
        } else {
          verdict = `For your situation, ${cheaper} saves you ${fmt(interestDelta)} in interest. ${faster} gets you a win ${monthsDelta} ${plural(monthsDelta)} sooner.`
        }
        strategy.push({
          id: 'strategy',
          tone: 'info',
          icon: Trophy,
          title: `${cheaper} is your recommended strategy`,
          description: verdict,
          link: { to: '/simulation', label: 'Compare in the simulator' },
        })
      } else {
        strategy.push({
          id: 'strategy',
          tone: 'danger',
          icon: AlertOctagon,
          title: 'Your budget is below your minimum payments',
          description: `Your monthly budget (${fmt(monthlyBudget)}) doesn't cover your combined minimum payments (${fmt(totalMinimums)}). Raise it to build a payoff plan.`,
          link: { to: '/debts', label: 'Adjust budget' },
        })
      }
    }

    // DEBT-SPECIFIC WARNINGS (conditional)
    for (const d of active) {
      const monthlyInterest = (d.balance * d.interestRate) / 1200
      if (d.interestRate > 15) {
        warnings.push({
          id: `hi-${d.id}`,
          tone: 'warning',
          icon: Flame,
          title: `High interest: ${d.title}`,
          description: `Your ${d.title} at ${formatPercent(d.interestRate)} is costing you ${fmt(monthlyInterest)}/month in interest alone.`,
          link: { to: '/debts', label: 'Review debt' },
        })
      }
      if (d.monthlyPayment < monthlyInterest * 1.2) {
        warnings.push({
          id: `trap-${d.id}`,
          tone: 'danger',
          icon: AlertTriangle,
          title: `Minimum payment trap: ${d.title}`,
          description: `Warning: Your ${d.title} minimum payment barely covers the interest — your balance is barely shrinking.`,
          link: { to: '/debts', label: 'Increase payment' },
        })
      }
    }
    if (affordable) {
      for (const p of avalanche.payoffOrder) {
        if (p.monthsToPayoff <= 3) {
          const freed = active.find((d) => d.id === p.debtId)?.monthlyPayment ?? 0
          warnings.push({
            id: `quick-${p.debtId}`,
            tone: 'good',
            icon: Zap,
            title: `Quick win: ${p.title}`,
            description: `You could eliminate ${p.title} in just ${p.monthsToPayoff} ${plural(p.monthsToPayoff)} — clearing it would free up ${fmt(freed)}/month.`,
            link: { to: '/simulation', label: 'See plan' },
          })
        }
      }
    }

    // BUDGET RECOMMENDATIONS (always shown when there are debts)
    if (active.length > 0) {
      if (affordable) {
        for (const add of [100, 200]) {
          const r = runAvalanche({ debts, monthlyBudget: monthlyBudget + add })
          const saved = avalanche.monthsToPayoff - r.monthsToPayoff
          budget.push({
            id: `plus-${add}`,
            tone: 'good',
            icon: Rocket,
            title: `Add ${fmt(add)}/month`,
            description:
              saved > 0
                ? `Putting an extra ${fmt(add)}/month toward your debts makes you debt-free ${saved} ${plural(saved)} sooner.`
                : `An extra ${fmt(add)}/month keeps you on a similar timeline — your debts already clear quickly.`,
            link: { to: '/debts', label: 'Update budget' },
          })
        }
      }
      const minBudget = minBudgetForMonths(debts, totalMinimums, totalDebt, 24)
      budget.push({
        id: 'min-2y',
        tone: 'info',
        icon: Target,
        title: 'Pay off everything within 2 years',
        description: minBudget
          ? `A monthly budget of about ${fmt(minBudget)} would clear all your debts within 24 months.`
          : 'Even a very large budget struggles to clear these within 24 months — focus on the highest-rate debts first.',
        link: { to: '/debts', label: 'Set budget' },
      })
    }

    // GENERAL TIPS (3-4 based on data)
    const dti =
      monthlyIncome > 0 ? (totalMinimums / monthlyIncome) * 100 : null
    if (dti !== null && dti > 35) {
      tips.push({
        id: 'dti',
        tone: 'warning',
        icon: Activity,
        title: 'High debt-to-income ratio',
        description: `Your debt-to-income ratio is ${dti.toFixed(0)}% — that's high. Consider pausing new debt until it comes down.`,
        link: { to: '/dashboard', label: 'View health' },
      })
    }
    const highRate = active
      .filter((d) => d.interestRate > 20)
      .sort((a, b) => b.interestRate - a.interestRate)[0]
    if (highRate) {
      tips.push({
        id: 'transfer',
        tone: 'info',
        icon: ArrowLeftRight,
        title: 'Consider a balance transfer',
        description: `Consider a balance transfer for ${highRate.title} to reduce the ${formatPercent(highRate.interestRate)} rate.`,
      })
    }
    if (active.length > 3) {
      tips.push({
        id: 'consolidate',
        tone: 'info',
        icon: Layers,
        title: 'Consolidation could simplify things',
        description: `Consolidating your ${active.length} debts could simplify everything into one payment.`,
      })
    }
    tips.push({
      id: 'autopay',
      tone: 'good',
      icon: Repeat,
      title: 'Set up autopay',
      description: 'Setting up autopay prevents missed payments and late fees.',
    })

    return {
      strategy,
      warnings,
      budget,
      tips,
      hasDebts: active.length > 0,
    }
  }, [debts, monthlyBudget, monthlyIncome, fmt])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Recommendations
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Personalized guidance based on your debts and budget.
        </p>
      </header>

      {!hasDebts ? (
        <section className="card">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Nothing to recommend yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Add a debt and a monthly budget to get personalized
            recommendations.
          </p>
          <Link to="/debts" className="btn-primary mt-4 inline-block">
            Go to debts
          </Link>
        </section>
      ) : (
        <>
          <RecSection title="Recommended strategy" recs={strategy} />
          {warnings.length > 0 && (
            <RecSection title="Things to watch" recs={warnings} />
          )}
          <RecSection title="Budget recommendations" recs={budget} />
          <RecSection title="Tips" recs={tips} />
        </>
      )}
    </div>
  )
}

function RecSection({ title, recs }: { title: string; recs: Rec[] }) {
  if (recs.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      <div className="space-y-3">
        {recs.map((rec) => (
          <RecCard key={rec.id} rec={rec} />
        ))}
      </div>
    </section>
  )
}

function RecCard({ rec }: { rec: Rec }) {
  const Icon = rec.icon
  const tone = TONE[rec.tone]
  return (
    <div className={cn('card flex items-start gap-4 border-l-4', tone.border)}>
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          tone.icon,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">
          {rec.title}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {rec.description}
        </p>
        {rec.link && (
          <Link
            to={rec.link.to}
            className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {rec.link.label} →
          </Link>
        )}
      </div>
    </div>
  )
}
