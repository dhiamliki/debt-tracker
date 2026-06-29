import { apiClient } from './client'
import type { Debt } from '@/types/debt'

/** Shape of a debt as returned by the backend (com.dhiamliki...debt.Debt). */
interface BackendDebt {
  id: string
  userId: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
  createdAt: string
  updatedAt: string
}

/** Map a backend debt to the frontend Debt type. */
function toDebt(d: BackendDebt): Debt {
  return {
    id: d.id,
    title: d.name,
    balance: d.balance,
    interestRate: d.interestRate,
    monthlyPayment: d.minimumPayment,
    // The backend doesn't persist status — derive it from the balance.
    status: d.balance <= 0 ? 'PAID' : 'ACTIVE',
    createdAt: d.createdAt,
  }
}

/** Map a frontend Debt to the backend's DebtInput request shape. */
function toDebtInput(d: Debt) {
  return {
    name: d.title,
    balance: d.balance,
    interestRate: d.interestRate,
    minimumPayment: d.monthlyPayment,
  }
}

/** GET /api/debts — the authenticated user's saved debts. */
export async function getDebts(): Promise<Debt[]> {
  const res = await apiClient.get('/debts')
  const data = res.data?.data as BackendDebt[] | undefined
  return (data ?? []).map(toDebt)
}

/** POST /api/debts — replace the user's debts with the full list. */
export async function saveDebts(debts: Debt[]): Promise<Debt[]> {
  const res = await apiClient.post('/debts', debts.map(toDebtInput))
  const data = res.data?.data as BackendDebt[] | undefined
  return (data ?? []).map(toDebt)
}
