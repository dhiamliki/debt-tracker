import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  Database,
  Download,
  Palette,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { useDebtStore } from '@/store/debtStore'
import { cn } from '@/utils/cn'

const CURRENCIES: [string, string][] = [
  ['USD', 'USD ($)'],
  ['EUR', 'EUR (€)'],
  ['GBP', 'GBP (£)'],
  ['TND', 'TND (TND)'],
  ['CAD', 'CAD (CA$)'],
  ['AED', 'AED (AED)'],
]
const LANGUAGES = ['English', 'French', 'Arabic']

export default function PreferencesPage() {
  const navigate = useNavigate()

  // Live-bound (apply immediately)
  const darkMode = useDebtStore((s) => s.darkMode)
  const toggleDarkMode = useDebtStore((s) => s.toggleDarkMode)
  const currency = useDebtStore((s) => s.currency)
  const setCurrency = useDebtStore((s) => s.setCurrency)

  // Committed on Save
  const setPreferences = useDebtStore((s) => s.setPreferences)
  const clearAllData = useDebtStore((s) => s.clearAllData)

  const [language, setLanguage] = useState(useDebtStore.getState().language)
  const [defaultStrategy, setDefaultStrategy] = useState(
    useDebtStore.getState().defaultStrategy,
  )
  const [budget, setBudget] = useState(() => {
    const b = useDebtStore.getState().monthlyBudget
    return b ? String(b) : ''
  })
  const [remindPayments, setRemindPayments] = useState(
    useDebtStore.getState().remindPayments,
  )
  const [showTips, setShowTips] = useState(useDebtStore.getState().showTips)
  const [showHealthScore, setShowHealthScore] = useState(
    useDebtStore.getState().showHealthScore,
  )

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setPreferences({
      language,
      defaultStrategy,
      monthlyBudget: Number(budget) || 0,
      remindPayments,
      showTips,
      showHealthScore,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const handleExport = () => {
    const s = useDebtStore.getState()
    const data = {
      debts: s.debts,
      payments: s.payments,
      currency: s.currency,
      monthlyBudget: s.monthlyBudget,
      monthlyIncome: s.monthlyIncome,
      darkMode: s.darkMode,
      language: s.language,
      defaultStrategy: s.defaultStrategy,
      remindPayments: s.remindPayments,
      showTips: s.showTips,
      showHealthScore: s.showHealthScore,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'debttracker-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    const ok = window.confirm(
      'This permanently deletes all your debts, payments, and settings on this device. Continue?',
    )
    if (!ok) return
    clearAllData()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Customize how DebtTracker looks and behaves.
        </p>
      </header>

      {/* 1. Appearance */}
      <Section
        icon={Palette}
        title="Appearance"
        description="Theme and language for the interface."
      >
        <Toggle
          label="Dark mode"
          description="Switch between light and dark themes."
          checked={darkMode}
          onChange={toggleDarkMode}
        />
        <Row label="Language" description="Interface language preference.">
          <select
            className="input sm:w-48"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      {/* 2. Simulation defaults */}
      <Section
        icon={SlidersHorizontal}
        title="Simulation defaults"
        description="Starting values used across the app."
      >
        <Row
          label="Default strategy"
          description="Pre-selected strategy for new simulations."
        >
          <div className="flex gap-4">
            {(['SNOWBALL', 'AVALANCHE'] as const).map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="radio"
                  name="defaultStrategy"
                  className="accent-primary-600"
                  checked={defaultStrategy === s}
                  onChange={() => setDefaultStrategy(s)}
                />
                {s === 'SNOWBALL' ? 'Snowball' : 'Avalanche'}
              </label>
            ))}
          </div>
        </Row>
        <Row
          label="Default monthly budget"
          description="Pre-fills the budget on the Debts page."
        >
          <input
            type="number"
            min="0"
            step="10"
            placeholder="0"
            className="input sm:w-48"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </Row>
        <Row
          label="Default currency"
          description="Used to format all amounts."
        >
          <select
            className="input sm:w-48"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      {/* 3. Notifications */}
      <Section
        icon={Bell}
        title="Notifications"
        description="Choose what DebtTracker surfaces for you."
      >
        <Toggle
          label="Remind me to log monthly payments"
          checked={remindPayments}
          onChange={setRemindPayments}
        />
        <Toggle
          label="Show tips and recommendations on dashboard"
          checked={showTips}
          onChange={setShowTips}
        />
        <Toggle
          label="Show financial health score"
          checked={showHealthScore}
          onChange={setShowHealthScore}
        />
      </Section>

      {/* 4. Data & privacy */}
      <Section
        icon={Database}
        title="Data & privacy"
        description="Your data is stored only in this browser."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleExport}
            className="btn-ghost flex items-center justify-center gap-2 border border-surface-200 dark:border-slate-600"
          >
            <Download className="h-4 w-4" />
            Export my data
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Clear all local data
          </button>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save preferences
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            Saved!
          </span>
        )}
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Palette
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none',
          checked ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}
