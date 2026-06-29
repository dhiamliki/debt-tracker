import { useState, type ReactNode } from 'react'
import { useDebtStore } from '@/store/debtStore'
import { useCurrencyFormatter } from '@/utils/format'
import { cn } from '@/utils/cn'

/* ---------- math helpers (pure) ---------- */

/** Amortize a balance until paid off. Returns null if the payment can never clear it. */
function amortize(
  balance: number,
  monthlyRate: number,
  payment: number,
  cap = 1200,
): { months: number; totalInterest: number; totalPaid: number } | null {
  if (balance <= 0 || payment <= 0) return null
  if (monthlyRate > 0 && payment <= balance * monthlyRate) return null
  let bal = balance
  let interest = 0
  let months = 0
  while (bal > 0 && months < cap) {
    const i = bal * monthlyRate
    bal += i
    interest += i
    bal -= Math.min(payment, bal)
    months++
  }
  if (bal > 0) return null
  return { months, totalInterest: interest, totalPaid: balance + interest }
}

/** Fixed monthly payment to clear `balance` over `months` at `monthlyRate`. */
function monthlyPaymentFor(
  balance: number,
  monthlyRate: number,
  months: number,
): number {
  if (months <= 0 || balance <= 0) return 0
  if (monthlyRate === 0) return balance / months
  const f = Math.pow(1 + monthlyRate, months)
  return (balance * monthlyRate * f) / (f - 1)
}

/** Interest accrued over a fixed window while making `payment` each month. */
function interestOverMonths(
  balance: number,
  monthlyRate: number,
  payment: number,
  months: number,
): number {
  let bal = balance
  let interest = 0
  for (let m = 0; m < months && bal > 0; m++) {
    const i = bal * monthlyRate
    bal += i
    interest += i
    bal -= Math.min(payment, bal)
  }
  return interest
}

/** Month offset from today as "August 2028". */
function payoffDate(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/* ---------- shared UI ---------- */

function CalcCard({
  accent,
  title,
  subtitle,
  children,
}: {
  accent: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm dark:border-slate-700 dark:bg-surface-800">
      <div className={cn('px-5 py-4', accent)}>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm opacity-80">{subtitle}</p>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder = '0',
  suffix,
  step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  suffix?: string
  step?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step={step}
          className={cn('input', suffix && 'pr-9')}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  display,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  display: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-primary-600"
      />
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold',
          tone ?? 'text-slate-900 dark:text-slate-100',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function Results({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg bg-surface-50 p-4 dark:bg-surface-700">
      {children}
    </div>
  )
}

/* ---------- page ---------- */

export default function CalculatorsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Calculators
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Quick financial calculators — results update as you type.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PayoffDateCalculator />
        <InterestCostCalculator />
        <DebtFreeBudgetCalculator />
        <BalanceTransferCalculator />
      </div>
    </div>
  )
}

/* ---------- 1. Payoff Date ---------- */

function PayoffDateCalculator() {
  const fmt = useCurrencyFormatter()
  const [balance, setBalance] = useState('')
  const [apr, setApr] = useState('')
  const [payment, setPayment] = useState('')

  const B = Number(balance) || 0
  const r = (Number(apr) || 0) / 1200
  const P = Number(payment) || 0
  const monthlyInterest = B * r
  const cannotPayOff = B > 0 && P > 0 && r > 0 && P <= monthlyInterest
  const result = !cannotPayOff ? amortize(B, r, P) : null

  return (
    <CalcCard
      accent="bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200"
      title="Payoff Date Calculator"
      subtitle="How long will it take to pay off a single debt?"
    >
      <NumberField label="Current balance" value={balance} onChange={setBalance} />
      <NumberField
        label="Interest rate (APR)"
        value={apr}
        onChange={setApr}
        suffix="%"
        step="0.01"
      />
      <NumberField
        label="Monthly payment"
        value={payment}
        onChange={setPayment}
      />

      {cannotPayOff ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Your monthly payment ({fmt(P)}) doesn’t cover the monthly interest (
          {fmt(monthlyInterest)}) — this debt will never be paid off.
        </p>
      ) : result ? (
        <Results>
          <Stat label="Months to payoff" value={`${result.months} mo`} />
          <Stat
            label="Total interest paid"
            value={fmt(result.totalInterest)}
            tone="text-amber-600 dark:text-amber-400"
          />
          <Stat label="Total amount paid" value={fmt(result.totalPaid)} />
          <Stat label="Payoff date" value={payoffDate(result.months)} />
        </Results>
      ) : (
        <p className="text-sm text-slate-400">
          Enter a balance, rate and payment to see your payoff date.
        </p>
      )}
    </CalcCard>
  )
}

/* ---------- 2. Interest Cost ---------- */

function InterestCostCalculator() {
  const fmt = useCurrencyFormatter()
  const [balance, setBalance] = useState('')
  const [apr, setApr] = useState('')
  const [term, setTerm] = useState(36)

  const B = Number(balance) || 0
  const r = (Number(apr) || 0) / 1200
  const payment = monthlyPaymentFor(B, r, term)
  const totalInterest = Math.max(0, payment * term - B)
  const totalCost = B + totalInterest
  const avgMonthlyInterest = term > 0 ? totalInterest / term : 0
  const principalPct = totalCost > 0 ? (B / totalCost) * 100 : 100
  const interestPct = 100 - principalPct
  const hasData = B > 0

  return (
    <CalcCard
      accent="bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
      title="Interest Cost Calculator"
      subtitle="How much does your interest rate actually cost you?"
    >
      <NumberField label="Loan balance" value={balance} onChange={setBalance} />
      <NumberField
        label="Interest rate (APR)"
        value={apr}
        onChange={setApr}
        suffix="%"
        step="0.01"
      />
      <SliderField
        label="Loan term"
        value={term}
        onChange={setTerm}
        min={12}
        max={120}
        display={`${term} months`}
      />

      {hasData ? (
        <Results>
          <Stat label="Monthly payment" value={fmt(payment)} />
          <Stat label="Avg interest / month" value={fmt(avgMonthlyInterest)} />
          <Stat
            label="Total interest over term"
            value={fmt(totalInterest)}
            tone="text-amber-600 dark:text-amber-400"
          />
          <Stat label="Total cost (principal + interest)" value={fmt(totalCost)} />
          <div className="pt-1">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-slate-600">
              <div
                className="bg-indigo-500"
                style={{ width: `${principalPct}%` }}
              />
              <div
                className="bg-amber-400"
                style={{ width: `${interestPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Principal {principalPct.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Interest {interestPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </Results>
      ) : (
        <p className="text-sm text-slate-400">
          Enter a balance and rate to see the cost of the loan.
        </p>
      )}
    </CalcCard>
  )
}

/* ---------- 3. Debt-Free Budget ---------- */

function DebtFreeBudgetCalculator() {
  const fmt = useCurrencyFormatter()
  const debts = useDebtStore((s) => s.debts)
  const active = debts.filter((d) => d.balance > 0)
  const storeTotal = active.reduce((s, d) => s + d.balance, 0)
  const currentMin = active.reduce((s, d) => s + d.monthlyPayment, 0)
  const storeWeighted =
    storeTotal > 0
      ? active.reduce((s, d) => s + d.balance * d.interestRate, 0) / storeTotal
      : 0

  const [balance, setBalance] = useState(
    storeTotal ? String(Math.round(storeTotal)) : '',
  )
  const [rate, setRate] = useState(storeWeighted ? storeWeighted.toFixed(1) : '')
  const [months, setMonths] = useState(24)

  const B = Number(balance) || 0
  const r = (Number(rate) || 0) / 1200
  const required = monthlyPaymentFor(B, r, months)
  const totalInterest = Math.max(0, required * months - B)
  const extraNeeded = Math.max(0, required - currentMin)
  const hasData = B > 0

  return (
    <CalcCard
      accent="bg-green-50 text-green-900 dark:bg-green-500/15 dark:text-green-200"
      title="Debt-Free Budget Calculator"
      subtitle="How much must I pay monthly to be debt-free by a date?"
    >
      <NumberField
        label="Total debt balance"
        value={balance}
        onChange={setBalance}
      />
      <NumberField
        label="Average interest rate (APR)"
        value={rate}
        onChange={setRate}
        suffix="%"
        step="0.01"
      />
      <SliderField
        label="Target payoff time"
        value={months}
        onChange={setMonths}
        min={6}
        max={60}
        display={`${months} months`}
      />

      {hasData ? (
        <Results>
          <Stat
            label="Required monthly payment"
            value={fmt(required)}
            tone="text-green-600 dark:text-green-400"
          />
          <Stat label="Total interest at that pace" value={fmt(totalInterest)} />
          <Stat label="Your current minimums" value={fmt(currentMin)} />
          <Stat
            label="Extra above minimums needed"
            value={extraNeeded > 0 ? `+${fmt(extraNeeded)}` : 'None — covered'}
            tone={
              extraNeeded > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-green-600 dark:text-green-400'
            }
          />
        </Results>
      ) : (
        <p className="text-sm text-slate-400">
          Enter a balance and rate to see the payment you need.
        </p>
      )}
    </CalcCard>
  )
}

/* ---------- 4. Balance Transfer Savings ---------- */

function BalanceTransferCalculator() {
  const fmt = useCurrencyFormatter()
  const [balance, setBalance] = useState('')
  const [apr, setApr] = useState('')
  const [payment, setPayment] = useState('')
  const [feePct, setFeePct] = useState('3')
  const [promo, setPromo] = useState(12)

  const B = Number(balance) || 0
  const r = (Number(apr) || 0) / 1200
  const P = Number(payment) || 0
  const fee = (Number(feePct) || 0) / 100

  const interestSaved = B > 0 && P > 0 ? interestOverMonths(B, r, P, promo) : 0
  const feeCost = B * fee
  const netSavings = interestSaved - feeCost
  const worthIt = netSavings > 0
  const transferred = B + feeCost
  const monthsAt0 = P > 0 ? Math.ceil(transferred / P) : Infinity
  const clearsInPromo = Number.isFinite(monthsAt0) && monthsAt0 <= promo
  const hasData = B > 0 && P > 0

  return (
    <CalcCard
      accent="bg-purple-50 text-purple-900 dark:bg-purple-500/15 dark:text-purple-200"
      title="Balance Transfer Savings"
      subtitle="How much would a 0% balance transfer save me?"
    >
      <NumberField label="Current balance" value={balance} onChange={setBalance} />
      <NumberField
        label="Current interest rate (APR)"
        value={apr}
        onChange={setApr}
        suffix="%"
        step="0.01"
      />
      <NumberField
        label="Current monthly payment"
        value={payment}
        onChange={setPayment}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Transfer fee"
          value={feePct}
          onChange={setFeePct}
          suffix="%"
          step="0.1"
        />
        <SliderField
          label="0% promo"
          value={promo}
          onChange={setPromo}
          min={6}
          max={36}
          display={`${promo} mo`}
        />
      </div>

      {hasData ? (
        <Results>
          <Stat
            label={`Interest saved (${promo} mo)`}
            value={fmt(interestSaved)}
            tone="text-green-600 dark:text-green-400"
          />
          <Stat label="Transfer fee cost" value={fmt(feeCost)} />
          <Stat
            label="Net savings"
            value={`${netSavings >= 0 ? '' : '−'}${fmt(Math.abs(netSavings))}`}
            tone={
              worthIt
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
          />
          <Stat
            label="Payoff during promo"
            value={
              Number.isFinite(monthsAt0)
                ? `${monthsAt0} mo${clearsInPromo ? '' : ' (exceeds promo)'}`
                : '—'
            }
            tone={
              clearsInPromo
                ? undefined
                : 'text-amber-600 dark:text-amber-400'
            }
          />
          <div
            className={cn(
              'mt-1 rounded-lg p-2 text-center text-sm font-semibold',
              worthIt
                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
            )}
          >
            {worthIt
              ? `Worth it — you’d save ${fmt(netSavings)}`
              : 'Not worth it — the fee outweighs the savings'}
          </div>
        </Results>
      ) : (
        <p className="text-sm text-slate-400">
          Enter your balance, rate and payment to compare.
        </p>
      )}
    </CalcCard>
  )
}
