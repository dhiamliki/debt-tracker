import { Fragment, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/debtStore'
import { runSnowball, runAvalanche } from '@/utils/simulate'
import { formatPercent, useCurrencyFormatter } from '@/utils/format'

const CURRENCIES = [
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'TND', label: 'TND (TND)', symbol: 'TND' },
  { code: 'CAD', label: 'CAD (CA$)', symbol: 'CA$' },
  { code: 'AED', label: 'AED (AED)', symbol: 'AED' },
]

const DEBT_BORDERS = ['#6366f1', '#22c55e', '#f59e0b', '#a855f7']

interface FormFields {
  name: string
  balance: string
  interestRate: string
  minimumPayment: string
}

const EMPTY_FORM: FormFields = {
  name: '',
  balance: '',
  interestRate: '',
  minimumPayment: '',
}

/** Small "?" badge that reveals a short explanation on hover (native title). */
function HelpIcon({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-200 text-[10px] font-semibold text-slate-600"
    >
      ?
    </span>
  )
}

/** Number input with a leading currency-symbol badge. */
function MoneyInput({
  id,
  value,
  onChange,
  symbol,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  symbol: string
}) {
  return (
    <div className="flex">
      <span className="inline-flex shrink-0 items-center rounded-l-lg border border-r-0 border-surface-200 bg-surface-100 px-3 text-sm font-medium text-slate-500">
        {symbol}
      </span>
      <input
        id={id}
        className="input rounded-l-none"
        type="number"
        min="0"
        step="10"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default function DebtsPage() {
  const navigate = useNavigate()
  const debts = useDebtStore((s) => s.debts)
  const addDebt = useDebtStore((s) => s.addDebt)
  const updateDebt = useDebtStore((s) => s.updateDebt)
  const removeDebt = useDebtStore((s) => s.removeDebt)
  const logPayment = useDebtStore((s) => s.logPayment)
  const currency = useDebtStore((s) => s.currency)
  const setCurrency = useDebtStore((s) => s.setCurrency)
  const storeBudget = useDebtStore((s) => s.monthlyBudget)
  const setStoreBudget = useDebtStore((s) => s.setMonthlyBudget)
  const formatCurrency = useCurrencyFormatter()

  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  // Local string mirror for smooth typing; the parsed value is synced to the
  // store (and persisted) so the dashboard can run the same simulation.
  const [monthlyBudget, setMonthlyBudget] = useState(
    storeBudget ? String(storeBudget) : '',
  )
  const [error, setError] = useState<string | null>(null)

  // Live total of all minimum payments — the floor the budget must clear.
  const totalMinimums = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  const currencySymbol =
    CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency
  const budgetNum = Number(monthlyBudget) || 0

  const setField = (field: keyof FormFields) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError(null)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const name = form.name.trim()
    const balance = Number(form.balance)
    const interestRate = Number(form.interestRate)
    const monthlyPayment = Number(form.minimumPayment)

    if (!name) return setError('Name is required.')
    if (!Number.isFinite(balance) || balance <= 0)
      return setError('Balance must be greater than 0.')
    if (!Number.isFinite(interestRate) || interestRate < 0)
      return setError('Interest rate must be 0 or greater.')
    if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0)
      return setError('Minimum payment must be greater than 0.')

    const payload = { title: name, balance, interestRate, monthlyPayment }
    if (editingId) {
      updateDebt(editingId, payload)
    } else {
      addDebt(payload)
    }
    resetForm()
  }

  const handleEdit = (id: string) => {
    const debt = debts.find((d) => d.id === id)
    if (!debt) return
    setEditingId(id)
    setError(null)
    setForm({
      name: debt.title,
      balance: String(debt.balance),
      interestRate: String(debt.interestRate),
      minimumPayment: String(debt.monthlyPayment),
    })
  }

  const handleDelete = (id: string) => {
    removeDebt(id)
    if (editingId === id) resetForm()
  }

  const openLog = (id: string) => {
    setLoggingId((curr) => (curr === id ? null : id))
    setPayAmount('')
    setPayNote('')
    setError(null)
  }

  const handleLogPayment = (id: string) => {
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    logPayment(id, amount, payNote)
    setLoggingId(null)
    setPayAmount('')
    setPayNote('')
  }

  const handleRunSimulation = () => {
    const budget = Number(monthlyBudget)
    if (debts.length === 0)
      return setError('Add at least one debt before simulating.')
    if (!Number.isFinite(budget) || budget <= 0)
      return setError('Enter a monthly budget greater than 0.')

    const input = { debts, monthlyBudget: budget }
    const snowball = runSnowball(input)
    const avalanche = runAvalanche(input)

    window.scrollTo({ top: 0 })
    navigate('/simulation', {
      state: { snowball, avalanche, monthlyBudget: budget },
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Debts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add your debts and a monthly budget, then compare payoff strategies.
        </p>
      </header>

      {/* Add / edit form */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900">
          {editingId ? 'Edit debt' : 'Add a debt'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label flex items-center gap-1" htmlFor="name">
                Name
                <HelpIcon text="What you call this debt, e.g. Visa Card or Student Loan" />
              </label>
              <input
                id="name"
                className="input"
                type="text"
                placeholder="e.g. Visa card"
                value={form.name}
                onChange={(e) => setField('name')(e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1" htmlFor="balance">
                Balance
                <HelpIcon text="The total amount you currently owe on this debt" />
              </label>
              <MoneyInput
                id="balance"
                symbol={currencySymbol}
                value={form.balance}
                onChange={setField('balance')}
              />
            </div>
            <div>
              <label
                className="label flex items-center gap-1"
                htmlFor="interestRate"
              >
                Interest rate (% APR)
                <HelpIcon text="The annual interest rate (APR) on this debt, e.g. 19.5" />
              </label>
              <input
                id="interestRate"
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
                value={form.interestRate}
                onChange={(e) => setField('interestRate')(e.target.value)}
              />
            </div>
            <div>
              <label
                className="label flex items-center gap-1"
                htmlFor="minimumPayment"
              >
                Minimum payment
                <HelpIcon text="The lowest monthly payment required by your lender" />
              </label>
              <MoneyInput
                id="minimumPayment"
                symbol={currencySymbol}
                value={form.minimumPayment}
                onChange={setField('minimumPayment')}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">
              {editingId ? 'Save changes' : 'Add debt'}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Existing debts */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900">
          Your debts ({debts.length})
        </h2>
        {debts.length === 0 ? (
          <p className="text-sm text-slate-500">No debts added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Balance</th>
                  <th className="py-2 pr-4 font-medium">Interest</th>
                  <th className="py-2 pr-4 font-medium">Min. payment</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt, i) => (
                  <Fragment key={debt.id}>
                    <tr className="border-b border-surface-100 last:border-0">
                      <td
                        className="border-l-4 py-3 pl-3 pr-4 font-medium text-slate-900"
                        style={{
                          borderLeftColor:
                            DEBT_BORDERS[i % DEBT_BORDERS.length],
                        }}
                      >
                        {debt.title}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {formatCurrency(debt.balance)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {formatPercent(debt.interestRate)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {formatCurrency(debt.monthlyPayment)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn-ghost px-3 py-1 text-sm"
                            onClick={() => openLog(debt.id)}
                          >
                            Log Payment
                          </button>
                          <button
                            type="button"
                            className="btn-ghost px-3 py-1 text-sm"
                            onClick={() => handleEdit(debt.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-3 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            onClick={() => handleDelete(debt.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {loggingId === debt.id && (
                      <tr className="border-b border-surface-100 bg-surface-50">
                        <td colSpan={5} className="px-3 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="sm:w-44">
                              <label
                                className="label"
                                htmlFor={`pay-${debt.id}`}
                              >
                                Amount paid this month
                              </label>
                              <MoneyInput
                                id={`pay-${debt.id}`}
                                symbol={currencySymbol}
                                value={payAmount}
                                onChange={setPayAmount}
                              />
                            </div>
                            <div className="sm:flex-1">
                              <label
                                className="label"
                                htmlFor={`note-${debt.id}`}
                              >
                                Note (optional)
                              </label>
                              <input
                                id={`note-${debt.id}`}
                                className="input"
                                type="text"
                                placeholder="e.g. tax refund"
                                value={payNote}
                                onChange={(e) => setPayNote(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={!(Number(payAmount) > 0)}
                                onClick={() => handleLogPayment(debt.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setLoggingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Budget + run */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900">
          Run simulation
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:max-w-xs sm:flex-1">
            <label
              className="label flex items-center gap-1"
              htmlFor="monthlyBudget"
            >
              Monthly budget
              <HelpIcon text="The total amount you can put toward all debts each month — must be more than your combined minimums" />
            </label>
            <MoneyInput
              id="monthlyBudget"
              symbol={currencySymbol}
              value={monthlyBudget}
              onChange={(v) => {
                setMonthlyBudget(v)
                setStoreBudget(Number(v) || 0)
              }}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleRunSimulation}
          >
            Run Simulation
          </button>
        </div>
        <p
          className={
            budgetNum > 0 && budgetNum <= totalMinimums
              ? 'mt-2 text-xs font-medium text-amber-600'
              : 'mt-2 text-xs text-slate-500'
          }
        >
          Your minimum payments total is {formatCurrency(totalMinimums)} — budget
          must exceed this
        </p>
      </section>
    </div>
  )
}
