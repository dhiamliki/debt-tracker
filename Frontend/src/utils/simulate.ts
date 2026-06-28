import type { Debt } from '@/types/debt'
import type {
  DebtPayoffResult,
  MonthlySnapshot,
  SimulationInput,
  SimulationResult,
  StrategyName,
} from '@/types/simulation'

/** Hard ceiling so an underfunded plan can never loop forever. */
const MAX_MONTHS = 1200

/** Mutable per-debt state tracked while stepping through months. */
interface DebtState {
  id: string
  title: string
  balance: number
  monthlyRate: number
  minPayment: number
  interestPaid: number
  payoffMonth: number
}

/**
 * Core month-by-month engine. `prioritize` returns the debts to receive the
 * leftover budget, ordered by the strategy's preference (highest priority
 * first). The function is pure: it copies all input before mutating.
 */
function simulate(
  input: SimulationInput,
  strategy: StrategyName,
  prioritize: (debts: DebtState[]) => DebtState[],
): SimulationResult {
  const active = (input.debts ?? []).filter(
    (d: Debt) => d.balance > 0 && d.status !== 'PAID',
  )

  const states: DebtState[] = active.map((d) => ({
    id: d.id,
    title: d.title,
    balance: d.balance,
    monthlyRate: d.interestRate / 100 / 12,
    minPayment: d.monthlyPayment,
    interestPaid: 0,
    payoffMonth: 0,
  }))

  const snapshots: MonthlySnapshot[] = []
  const payoffOrder: DebtPayoffResult[] = []

  // Nothing to pay off — return an empty, affordable result.
  if (states.length === 0) {
    return {
      strategy,
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      payoffOrder: [],
      snapshots: [],
      unaffordable: false,
    }
  }

  const totalMinimums = states.reduce((sum, s) => sum + s.minPayment, 0)
  // If the budget cannot even cover the minimums, the plan never converges.
  if (input.monthlyBudget < totalMinimums) {
    return {
      strategy,
      monthsToPayoff: Infinity,
      totalInterestPaid: Infinity,
      payoffOrder: [],
      snapshots: [],
      unaffordable: true,
    }
  }

  let month = 0
  let cleared = 0

  while (cleared < states.length && month < MAX_MONTHS) {
    month++

    // 1. Accrue interest on every outstanding debt.
    for (const s of states) {
      if (s.balance <= 0) continue
      const interest = s.balance * s.monthlyRate
      s.balance += interest
      s.interestPaid += interest
    }

    // 2. Each month gets the full budget to spend.
    let available = input.monthlyBudget

    // 3. Pay the minimum on every still-open debt first.
    for (const s of states) {
      if (s.balance <= 0) continue
      const pay = Math.min(s.minPayment, s.balance, available)
      s.balance -= pay
      available -= pay
    }

    // 4. Funnel everything left into the highest-priority open debts.
    for (const s of prioritize(states)) {
      if (available <= 0) break
      if (s.balance <= 0) continue
      const pay = Math.min(s.balance, available)
      s.balance -= pay
      available -= pay
    }

    // 5. Record any debts cleared this month, in payoff order.
    for (const s of states) {
      if (s.balance <= 0 && s.payoffMonth === 0) {
        s.balance = 0
        s.payoffMonth = month
        cleared++
        payoffOrder.push({
          debtId: s.id,
          title: s.title,
          payoffOrder: payoffOrder.length + 1,
          monthsToPayoff: month,
          interestPaid: round(s.interestPaid),
        })
      }
    }

    // 6. Snapshot end-of-month balances.
    const balances: Record<string, number> = {}
    let totalBalance = 0
    for (const s of states) {
      balances[s.id] = round(s.balance)
      totalBalance += s.balance
    }
    snapshots.push({ month, balances, totalBalance: round(totalBalance) })
  }

  const unaffordable = cleared < states.length
  const totalInterestPaid = states.reduce((sum, s) => sum + s.interestPaid, 0)

  return {
    strategy,
    monthsToPayoff: unaffordable ? Infinity : month,
    totalInterestPaid: unaffordable ? Infinity : round(totalInterestPaid),
    payoffOrder,
    snapshots,
    unaffordable,
  }
}

/** Avoid floating-point drift in reported figures (2 decimal places). */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Snowball: throw extra money at the smallest balance first. */
export function runSnowball(input: SimulationInput): SimulationResult {
  return simulate(input, 'SNOWBALL', (debts) =>
    [...debts].sort((a, b) => a.balance - b.balance),
  )
}

/** Avalanche: throw extra money at the highest interest rate first. */
export function runAvalanche(input: SimulationInput): SimulationResult {
  return simulate(input, 'AVALANCHE', (debts) =>
    [...debts].sort((a, b) => b.monthlyRate - a.monthlyRate),
  )
}
