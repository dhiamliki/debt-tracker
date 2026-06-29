import { useState } from 'react'
import { Bug, ChevronDown, Mail } from 'lucide-react'
import { cn } from '@/utils/cn'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the Debt Snowball strategy?',
    a: 'The Snowball method, popularized by Dave Ramsey, focuses on paying off your smallest debt balance first — regardless of interest rate. Here’s how it works: you make minimum payments on all debts, then throw every extra dollar at the smallest balance until it’s gone. Once that debt is eliminated, you take the freed-up minimum payment and roll it into the next smallest debt — creating a growing "snowball" effect. The psychological benefit is powerful: early wins keep you motivated and build momentum. Research shows people who get early wins are more likely to stay on track and become debt-free.',
  },
  {
    q: 'What is the Debt Avalanche strategy?',
    a: 'The Avalanche method is mathematically optimal. You target the debt with the highest annual interest rate first, making minimum payments on everything else. Once that debt is cleared, you roll the freed-up payment to the next highest rate. Because you’re eliminating the most expensive debt first, you pay less total interest over time. The trade-off: if your highest-rate debt also has a large balance, it can take months before you see your first payoff. This requires discipline and patience, but the financial savings are real — sometimes hundreds or thousands of dollars.',
  },
  {
    q: 'Which strategy is right for me?',
    a: 'There’s no universal answer — it depends on your personality and your numbers. If you’ve struggled with debt payoff before and need motivation, Snowball is probably better for you even if it costs slightly more. If you’re disciplined and focused on minimizing cost, Avalanche is the better choice. DebtTracker shows you the exact dollar and month difference for your specific debts — use the Simulation page to compare both and decide for yourself. Some people even start with Snowball to build confidence, then switch to Avalanche for larger debts.',
  },
  {
    q: 'How does the monthly budget work?',
    a: 'Your monthly budget is the total amount you commit to paying toward all your debts each month — not just the minimums. For example, if your three debts have minimums of $200, $300, and $150, your total minimum is $650. If you set a budget of $900, you have $250 in extra budget to funnel toward your priority debt. The larger your budget above the minimums, the faster you pay off debt and the less interest you pay. Even an extra $50/month can shave months off your payoff date.',
  },
  {
    q: 'What is the payment cascade?',
    a: 'When your extra budget pays off a debt completely, any leftover money doesn’t disappear — it cascades to the next priority debt in the same month. For example: Student Loan owes $300 and you have $500 extra. DebtTracker pays off the Student Loan ($300) and the remaining $200 immediately rolls to your next priority debt that same month. This cascade continues until the extra budget is exhausted. This is how real debt payoff accelerates exponentially as debts are eliminated.',
  },
  {
    q: 'What is a lump sum payment?',
    a: 'A lump sum is a one-time extra payment — like a tax refund, work bonus, or money from selling something. Instead of spending it, you apply it directly to a debt balance. DebtTracker’s Lump Sum calculator (on the Simulation and Extra Payments pages) shows exactly how much sooner you’d be debt-free and how much interest you’d save. "Best — auto" mode applies the lump sum to whichever debt saves you the most money (highest interest rate first).',
  },
  {
    q: 'Why do the strategies sometimes show identical results?',
    a: 'The strategies diverge only when the ranking by balance (Snowball) differs from the ranking by interest rate (Avalanche). If your smallest-balance debt also has the highest interest rate, both strategies pick the same debt first — so results are mathematically identical. Try adding debts where a large balance has a high rate and a small balance has a low rate — you’ll see them clearly diverge.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'DebtTracker is a simulation tool — it never connects to your bank account, never processes real payments, and never accesses any financial institution. Your debt data is stored in your personal account on our server (PostgreSQL, encrypted connection) and cached locally in your browser. We don’t share or sell your data. You can export or delete all your data at any time from the Preferences page.',
  },
]

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Add your debts',
    body: 'Go to the Debts page and add each debt: name, current balance, annual interest rate (APR), and minimum monthly payment. Be accurate — even small differences in interest rate significantly affect the simulation. You can edit or delete debts at any time.',
  },
  {
    title: 'Set your monthly budget',
    body: 'Enter the total amount you can realistically commit to debt payments each month. This must be at least the sum of all your minimum payments. The more you can add above the minimums, the faster you become debt-free. DebtTracker shows you exactly how much each extra $50 saves.',
  },
  {
    title: 'Run the simulation and explore',
    body: 'Hit "Run Simulation" to see both strategies side by side. Explore the What-If Simulator to model scenarios, use Extra Payments to see the impact of one-time lump sums, and check Analytics for a full breakdown of your debt costs. Save any scenario as a plan to compare later.',
  },
]

const GLOSSARY: { term: string; def: string }[] = [
  {
    term: 'APR (Annual Percentage Rate)',
    def: 'The yearly cost of borrowing money, expressed as a percentage. A 20% APR means you pay 20% of your balance in interest per year (roughly 1.67% per month).',
  },
  {
    term: 'Minimum payment',
    def: 'The lowest amount your lender requires you to pay each month. Paying only the minimum is the most expensive way to pay off debt — most of it goes to interest, barely touching the principal.',
  },
  {
    term: 'Principal',
    def: 'The original amount borrowed, not counting interest. Every payment you make goes partly to interest first, then reduces the principal.',
  },
  {
    term: 'Amortization',
    def: 'The process of paying off a debt through regular payments over time. Early payments are mostly interest; later payments are mostly principal.',
  },
  {
    term: 'Debt-to-income ratio (DTI)',
    def: 'Your total monthly debt payments divided by your gross monthly income. Under 20% is healthy, 20-35% is manageable, above 35% is high risk.',
  },
  {
    term: 'Interest cascade',
    def: 'When extra budget pays off a debt early in a month, the remaining extra rolls to the next priority debt in the same month — compounding the payoff acceleration.',
  },
  {
    term: 'Snowflake payment',
    def: 'A small, irregular extra payment — like cashback, refunds, or side income. Small snowflakes add up significantly over time.',
  },
]

export default function HelpSupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Help &amp; Support
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Answers, definitions, and how to get the most from DebtTracker.
        </p>
      </header>

      {/* 1. FAQ — single-open accordion */}
      <section className="card">
        <h2 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">
          Frequently asked questions
        </h2>
        <div className="divide-y divide-surface-100 dark:divide-slate-700">
          {FAQS.map((f, i) => (
            <FaqItem
              key={f.q}
              q={f.q}
              a={f.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* 2. How it works */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-lg border border-surface-200 p-4 dark:border-slate-700"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-medium text-slate-900 dark:text-slate-100">
                {s.title}
              </h3>
              <p className="mt-1 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Glossary */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Glossary
        </h2>
        <dl className="divide-y divide-surface-100 dark:divide-slate-700">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="py-3">
              <dt className="font-medium text-slate-900 dark:text-slate-100">
                {g.term}
              </dt>
              <dd className="mt-1 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {g.def}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 4. Contact / feedback */}
      <section className="card">
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Have feedback or found a bug? We&apos;d love to hear from you.
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:dhiamliki1@gmail.com"
            className="flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-surface-700"
          >
            <Mail className="h-4 w-4" />
            dhiamliki1@gmail.com
          </a>
          <a
            href="https://github.com/dhiamliki/debt-tracker/issues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-surface-700"
          >
            <Bug className="h-4 w-4" />
            github.com/dhiamliki/debt-tracker/issues
          </a>
        </div>
      </section>
    </div>
  )
}

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string
  a: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-3 text-left"
      >
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {q}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <p className="mt-1 border-t border-surface-100 px-2 py-4 text-base leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {a}
        </p>
      )}
    </div>
  )
}
