import { apiClient } from './client'
import type { Debt } from '@/types/debt'
import type { SimulationResult } from '@/types/simulation'

/** A saved plan as returned by the backend (JSON columns come back parsed). */
export interface SavedPlan {
  id: string
  name: string
  monthlyBudget: number
  debtsSnapshot: Debt[]
  snowballResult: SimulationResult | null
  avalancheResult: SimulationResult | null
  createdAt: string
}

/** Both strategy results for the scenario being saved. */
export interface PlanResults {
  snowball: SimulationResult
  avalanche: SimulationResult
}

/** GET /api/plans — the authenticated user's saved plans. */
export async function getPlans(): Promise<SavedPlan[]> {
  const res = await apiClient.get('/plans')
  return (res.data?.data ?? []) as SavedPlan[]
}

/** POST /api/plans — persist a new plan. */
export async function savePlan(
  name: string,
  debts: Debt[],
  budget: number,
  results: PlanResults,
): Promise<SavedPlan> {
  const res = await apiClient.post('/plans', {
    name,
    monthlyBudget: budget,
    debtsSnapshot: debts,
    snowballResult: results.snowball,
    avalancheResult: results.avalanche,
  })
  return res.data.data as SavedPlan
}

/** DELETE /api/plans/{id}. */
export async function deletePlan(id: string): Promise<void> {
  await apiClient.delete(`/plans/${id}`)
}
