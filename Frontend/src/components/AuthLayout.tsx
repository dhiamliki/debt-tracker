import type { ReactNode } from 'react'
import {
  BarChart3,
  LineChart,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Sparkles,
    title: 'Smart Simulations',
    description:
      'Compare Snowball vs Avalanche strategies and see what works best for you.',
  },
  {
    icon: LineChart,
    title: 'Visual Insights',
    description: 'Beautiful charts and timelines to track your progress.',
  },
  {
    icon: Target,
    title: 'Reach Your Goals',
    description: 'Plan with confidence and become debt free sooner.',
  },
]

/**
 * Two-column auth shell: a decorative dark-navy marketing panel on the left
 * (hidden on small screens) and the page's form card on the right.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* LEFT — marketing panel */}
      <aside
        className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ backgroundColor: '#0f1729' }}
      >
        {/* subtle dotted pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(129,140,248,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-semibold text-white">DebtTracker</span>
        </div>

        {/* Headline + features */}
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Take control of your <span className="text-primary-400">debt.</span>
          </h1>
          <p className="mt-3 text-base text-slate-400">
            Plan smarter. Pay faster. Become debt free.
          </p>

          <div className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative mini chart card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Projected balance</p>
              <p className="text-sm font-medium text-white">
                Snowball vs Avalanche
              </p>
            </div>
            <div className="rounded-lg bg-primary-500/15 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-wide text-primary-300">
                Debt Free In
              </p>
              <p className="text-sm font-bold text-white">28 months</p>
              <p className="text-[10px] text-slate-400">Using Avalanche</p>
            </div>
          </div>

          <svg
            viewBox="0 0 320 110"
            className="mt-4 h-28 w-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            {[22, 48, 74].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="320"
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            {/* Snowball — slower descent */}
            <polyline
              fill="none"
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,18 53,30 107,40 160,55 213,72 267,88 320,98"
            />
            {/* Avalanche — faster descent */}
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,20 53,38 107,58 160,74 213,88 267,98 320,104"
            />
          </svg>

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-400" />
              Snowball
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Avalanche
            </span>
          </div>
        </div>
      </aside>

      {/* RIGHT — form panel */}
      <main className="flex w-full items-center justify-center bg-surface-100 px-4 py-10 lg:w-[55%]">
        <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
          {children}
        </div>
      </main>
    </div>
  )
}
