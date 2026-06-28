import type { Debt } from '@/types/debt'

export type StrategyName = 'SNOWBALL' | 'AVALANCHE'

export interface SimulationInput {
  debts: Debt[]
  monthlyBudget: number
}

/** End-of-month balance for every debt, keyed by debt id. */
export interface MonthlySnapshot {
  month: number
  balances: Record<string, number>
  totalBalance: number
}

/** Per-debt outcome over the full simulation. */
export interface DebtPayoffResult {
  debtId: string
  title: string
  /** 1-based position in which this debt was cleared. */
  payoffOrder: number
  /** Month the debt reached a zero balance. */
  monthsToPayoff: number
  /** Total interest accrued on this debt across its lifetime. */
  interestPaid: number
}

export interface SimulationResult {
  strategy: StrategyName
  /** Months until every debt is cleared. */
  monthsToPayoff: number
  /** Sum of interest paid across all debts. */
  totalInterestPaid: number
  /** Debts in the order they were paid off. */
  payoffOrder: DebtPayoffResult[]
  /** Month-by-month balance snapshot per debt. */
  snapshots: MonthlySnapshot[]
  /** True if the budget could not cover the minimum payments. */
  unaffordable: boolean
}
