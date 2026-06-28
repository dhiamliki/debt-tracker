import { useMemo } from 'react'
import { useDebtStore } from '@/store/debtStore'

export function formatCurrency(value: number, currency = 'USD') {
  // No explicit fraction digits: let Intl apply per-currency conventions
  // (e.g. USD/EUR = 2 decimals, TND = 3). Forcing 2 would throw a RangeError
  // for currencies whose default minimum exceeds it.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export function formatMonths(value: number) {
  return `${value} mo`
}

/**
 * Format a payoff duration as "33 months (Aug 2028)" — the month count plus
 * the projected calendar month, counted from today.
 */
export function formatMonthsWithDate(months: number) {
  if (!Number.isFinite(months)) return '—'
  const label = `${months} ${months === 1 ? 'month' : 'months'}`
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  const when = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${label} (${when})`
}

/**
 * Returns a currency formatter bound to the currency selected in the store.
 * Components that call this re-render when the currency changes, so every
 * displayed amount updates instantly.
 */
export function useCurrencyFormatter() {
  const currency = useDebtStore((s) => s.currency)
  return useMemo(
    () => (value: number) => formatCurrency(value, currency),
    [currency],
  )
}
