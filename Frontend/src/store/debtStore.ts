import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateDebtInput, Debt, Payment } from '@/types/debt'

interface DebtState {
  debts: Debt[]
  payments: Payment[]
  currency: string
  monthlyBudget: number
  monthlyIncome: number
  addDebt: (input: CreateDebtInput) => void
  updateDebt: (id: string, input: Partial<CreateDebtInput>) => void
  removeDebt: (id: string) => void
  clearDebts: () => void
  setCurrency: (currency: string) => void
  setMonthlyBudget: (monthlyBudget: number) => void
  setMonthlyIncome: (monthlyIncome: number) => void
  logPayment: (debtId: string, amount: number, note?: string) => void
}

export const useDebtStore = create<DebtState>()(
  persist(
    (set) => ({
      debts: [],
      payments: [],
      currency: 'USD',
      monthlyBudget: 0,
      monthlyIncome: 0,
      addDebt: (input) =>
        set((state) => ({
          debts: [
            ...state.debts,
            {
              ...input,
              id: crypto.randomUUID(),
              status: input.status ?? 'ACTIVE',
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateDebt: (id, input) =>
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...input } : d)),
        })),
      removeDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
          payments: state.payments.filter((p) => p.debtId !== id),
        })),
      clearDebts: () => set({ debts: [], payments: [] }),
      setCurrency: (currency) => set({ currency }),
      setMonthlyBudget: (monthlyBudget) => set({ monthlyBudget }),
      setMonthlyIncome: (monthlyIncome) => set({ monthlyIncome }),
      logPayment: (debtId, amount, note) =>
        set((state) => {
          const now = new Date()
          const payment: Payment = {
            debtId,
            amount,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            ...(note?.trim() ? { note: note.trim() } : {}),
          }
          return {
            payments: [...state.payments, payment],
            debts: state.debts.map((d) => {
              if (d.id !== debtId) return d
              const balance = Math.max(0, d.balance - amount)
              return { ...d, balance, status: balance <= 0 ? 'PAID' : d.status }
            }),
          }
        }),
    }),
    { name: 'debt-tracker-debts' },
  ),
)
