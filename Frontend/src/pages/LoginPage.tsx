import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import OtpInput from '@/components/OtpInput'
import SocialAuthButtons from '@/components/SocialAuthButtons'

const LOGIN_URL = 'http://localhost:8080/api/auth/login'
const VERIFY_2FA_URL = 'http://localhost:8080/api/auth/verify-2fa'
const RESEND_URL = 'http://localhost:8080/api/auth/resend-verification'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // The login response can ask for a one-time code before issuing a token.
  const [needs2FA, setNeeds2FA] = useState(false)
  // True when the backend blocked an unverified account — offer a resend link.
  const [needsVerification, setNeedsVerification] = useState(false)

  function finishLogin(token: string) {
    localStorage.setItem('token', token)
    navigate('/dashboard', { replace: true })
  }

  /** POST /api/auth/login. Returns true if a 2FA code is now required. */
  async function requestLogin(): Promise<boolean> {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json().catch(() => null)

    if (res.ok && body?.data?.requires2FA) {
      return true
    }
    if (res.ok && body?.data?.token) {
      finishLogin(body.data.token)
      return false
    }
    throw new Error(body?.message || 'Login failed. Please try again.')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNeedsVerification(false)
    setLoading(true)
    try {
      const requires2FA = await requestLogin()
      if (requires2FA) setNeeds2FA(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(message)
      // Surface a resend link when the account simply isn't verified yet.
      if (message.toLowerCase().includes('verify')) {
        setNeedsVerification(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (needs2FA) {
    return (
      <TwoFactorScreen
        email={email}
        onVerified={finishLogin}
        onResend={requestLogin}
        onBack={() => {
          setNeeds2FA(false)
          setError(null)
        }}
      />
    )
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome back 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to continue to DebtTracker
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
          {needsVerification && (
            <>
              {' '}
              <ResendVerificationLink email={email} />
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-surface-200 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
            />
            Remember me
          </label>
          <button
            type="button"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <SocialAuthButtons />

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Register
        </Link>
      </p>
    </AuthLayout>
  )
}

/** Small inline "Resend verification" trigger shown beside the verify error. */
function ResendVerificationLink({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    if (!email) return
    setState('sending')
    try {
      await fetch(RESEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setState('sent')
    } catch {
      setState('idle')
    }
  }

  if (state === 'sent') return <span className="font-medium">Email sent!</span>

  return (
    <button
      type="button"
      onClick={resend}
      disabled={state === 'sending'}
      className="font-semibold underline hover:no-underline disabled:opacity-60"
    >
      {state === 'sending' ? 'Sending…' : 'Resend verification'}
    </button>
  )
}

/** The 6-digit OTP entry shown after a 2FA-enabled login. */
function TwoFactorScreen({
  email,
  onVerified,
  onResend,
  onBack,
}: {
  email: string
  onVerified: (token: string) => void
  onResend: () => Promise<boolean>
  onBack: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(VERIFY_2FA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.data?.token) {
        throw new Error(body?.message || 'Invalid code. Please try again.')
      }
      onVerified(body.data.token)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid code. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResent(false)
    setCode('')
    try {
      await onResend()
      setResent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.')
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Enter verification code
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {email}
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-center text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {resent && !error && (
        <div className="mb-4 rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-3 py-2 text-center text-sm text-green-700 dark:text-green-300">
          A new code has been sent.
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <OtpInput value={code} onChange={setCode} />

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Didn't get a code?{' '}
        <button
          type="button"
          onClick={handleResend}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Resend code
        </button>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Back to sign in
        </button>
      </p>
    </AuthLayout>
  )
}
