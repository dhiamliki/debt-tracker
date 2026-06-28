export interface Debt {
  id: string
  title: string
  balance: number
  interestRate: number
  monthlyPayment: number
  status: 'ACTIVE' | 'PAID' | 'SAVED'
  createdAt?: string
}

export interface Payment {
  debtId: string
  month: number // 1-12
  year: number
  amount: number
  note?: string
}

export interface CreateDebtInput {
  title: string
  balance: number
  interestRate: number
  monthlyPayment: number
  status?: 'ACTIVE' | 'PAID' | 'SAVED'
}

export interface UserProfile {
  id: string
  fullName: string
  email: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  timestamp?: string
}
