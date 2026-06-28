import type { Debt } from '@/types/debt'
import type { SimulationResult, StrategyName } from '@/types/simulation'
import { runAvalanche, runSnowball } from '@/utils/simulate'

const SIMULATION_API_URL = 'http://localhost:8080/api/simulation/run'

/** Both strategies for a single run — what the page consumes. */
export interface SimulationApiResult {
  snowball: SimulationResult
  avalanche: SimulationResult
}

/** Shape of one strategy in the backend's SimulationResult. */
interface BackendStrategyResult {
  totalInterestPaid: number
  monthsToPayoff: number
  unaffordable: boolean
  payoffOrder: {
    debtId: string
    name: string
    paidOffInMonth: number
    interestPaid: number
  }[]
  monthlySnapshots: {
    month: number
    totalBalance: number
  }[]
}

/** Backend's combined SimulationResult (data field of ApiResponse). */
interface BackendSimulationResult {
  snowball: BackendStrategyResult
  avalanche: BackendStrategyResult
}

/**
 * Translate one backend strategy result into the frontend's per-strategy
 * SimulationResult. The backend encodes an unaffordable plan as -1 (int has
 * no Infinity); the frontend uses Infinity, so we restore it here. The backend
 * does not return per-debt balances, but the UI never reads them — totalBalance
 * drives the charts and the per-debt starting balance comes from the store.
 */
function mapStrategy(
  result: BackendStrategyResult,
  strategy: StrategyName,
): SimulationResult {
  return {
    strategy,
    monthsToPayoff: result.unaffordable ? Infinity : result.monthsToPayoff,
    totalInterestPaid: result.unaffordable
      ? Infinity
      : result.totalInterestPaid,
    payoffOrder: result.payoffOrder.map((p, i) => ({
      debtId: p.debtId,
      title: p.name,
      payoffOrder: i + 1,
      monthsToPayoff: p.paidOffInMonth,
      interestPaid: p.interestPaid,
    })),
    snapshots: result.monthlySnapshots.map((s) => ({
      month: s.month,
      balances: {},
      totalBalance: s.totalBalance,
    })),
    unaffordable: result.unaffordable,
  }
}

/** Local computation used when the backend is unreachable. */
function runLocal(debts: Debt[], monthlyBudget: number): SimulationApiResult {
  return {
    snowball: runSnowball({ debts, monthlyBudget }),
    avalanche: runAvalanche({ debts, monthlyBudget }),
  }
}

/**
 * Run the Snowball + Avalanche simulation on the backend. Maps the Zustand
 * debt store format to the backend's SimulationRequest. Falls back to the
 * local engine (utils/simulate) if the call fails for any reason.
 */
export async function callSimulationApi(
  debts: Debt[],
  monthlyBudget: number,
): Promise<SimulationApiResult> {
  const payload = {
    debts: debts.map((d) => ({
      id: d.id,
      name: d.title,
      balance: d.balance,
      interestRate: d.interestRate,
      minimumPayment: d.monthlyPayment,
    })),
    monthlyBudget,
  }

  try {
    const response = await fetch(SIMULATION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Simulation API returned ${response.status}`)
    }
    const body = await response.json()
    const data = body.data as BackendSimulationResult | undefined
    if (!data) {
      throw new Error('Simulation API response had no data field')
    }
    return {
      snowball: mapStrategy(data.snowball, 'SNOWBALL'),
      avalanche: mapStrategy(data.avalanche, 'AVALANCHE'),
    }
  } catch (error) {
    console.warn(
      'Backend simulation failed, falling back to local simulation.',
      error,
    )
    return runLocal(debts, monthlyBudget)
  }
}
