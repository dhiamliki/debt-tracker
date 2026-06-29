import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateDebtInput, Debt, Payment } from '@/types/debt'
import type { SimulationResult } from '@/types/simulation'

type DefaultStrategy = 'SNOWBALL' | 'AVALANCHE'

interface Preferences {
  currency: string
  monthlyBudget: number
  monthlyIncome: number
  darkMode: boolean
  language: string
  defaultStrategy: DefaultStrategy
  remindPayments: boolean
  showTips: boolean
  showHealthScore: boolean
}

interface DebtState {
  debts: Debt[]
  payments: Payment[]
  currency: string
  monthlyBudget: number
  monthlyIncome: number
  lastSnowballResult: SimulationResult | null
  lastAvalancheResult: SimulationResult | null
  darkMode: boolean
  language: string
  defaultStrategy: DefaultStrategy
  remindPayments: boolean
  showTips: boolean
  showHealthScore: boolean
  addDebt: (input: CreateDebtInput) => void
  updateDebt: (id: string, input: Partial<CreateDebtInput>) => void
  removeDebt: (id: string) => void
  setDebts: (debts: Debt[]) => void
  clearDebts: () => void
  setCurrency: (currency: string) => void
  setMonthlyBudget: (monthlyBudget: number) => void
  setMonthlyIncome: (monthlyIncome: number) => void
  setLastSimulationResults: (
    snowball: SimulationResult,
    avalanche: SimulationResult,
  ) => void
  toggleDarkMode: () => void
  setPreferences: (patch: Partial<Preferences>) => void
  clearAllData: () => void
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
      lastSnowballResult: null,
      lastAvalancheResult: null,
      darkMode: false,
      language: 'English',
      defaultStrategy: 'AVALANCHE',
      remindPayments: true,
      showTips: true,
      showHealthScore: true,
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
      setDebts: (debts) => set({ debts }),
      clearDebts: () => set({ debts: [], payments: [] }),
      setCurrency: (currency) => set({ currency }),
      setMonthlyBudget: (monthlyBudget) => set({ monthlyBudget }),
      setMonthlyIncome: (monthlyIncome) => set({ monthlyIncome }),
      setLastSimulationResults: (snowball, avalanche) =>
        set({ lastSnowballResult: snowball, lastAvalancheResult: avalanche }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setPreferences: (patch) => set(patch),
      clearAllData: () => {
        try {
          localStorage.clear()
        } catch {
          /* storage unavailable — fall through to in-memory reset */
        }
        set({
          debts: [],
          payments: [],
          currency: 'USD',
          monthlyBudget: 0,
          monthlyIncome: 0,
          lastSnowballResult: null,
          lastAvalancheResult: null,
          darkMode: false,
          language: 'English',
          defaultStrategy: 'AVALANCHE',
          remindPayments: true,
          showTips: true,
          showHealthScore: true,
        })
      },
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
