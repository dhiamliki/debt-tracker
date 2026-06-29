import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'

const VERIFY_URL = 'http://localhost:8080/api/auth/verify-email'
const RESEND_URL = 'http://localhost:8080/api/auth/resend-verification'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle',
  )
  const [resendEmail, setResendEmail] = useState('')

  // Guard against React 18 StrictMode double-invoking the effect in dev.
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    if (!token) {
      setStatus('error')
      setMessage('No verification token found in the link.')
      return
    }

    let redirectTimer: number | undefined

    async function verify() {
      try {
        const res = await fetch(
          `${VERIFY_URL}?token=${encodeURIComponent(token!)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        )
        const body = await res.json().catch(() => null)
        if (!res.ok || !body?.data?.token) {
          throw new Error(
            body?.message || 'This verification link is invalid or expired.',
          )
        }
        localStorage.setItem('token', body.data.token)
        setStatus('success')
        redirectTimer = window.setTimeout(
          () => navigate('/dashboard', { replace: true }),
          2000,
        )
      } catch (err) {
        setStatus('error')
        setMessage(
          err instanceof Error
            ? err.message
            : 'This verification link is invalid or expired.',
        )
      }
    }

    verify()
    return () => window.clearTimeout(redirectTimer)
  }, [token, navigate])

  async function handleResend() {
    if (!resendEmail) return
    setResendState('sending')
    try {
      await fetch(RESEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      setResendState('sent')
    } catch {
      setResendState('idle')
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
            <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Verifying your email…
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Hold tight while we activate your account.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
              <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Email verified!
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              You're all set. Redirecting you to your dashboard…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <XCircle className="h-9 w-9 text-red-600 dark:text-red-400" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {message}
            </p>

            <div className="mt-8 w-full">
              {resendState === 'sent' ? (
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  A new verification email is on its way — check your inbox.
                </p>
              ) : (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                  />
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending' || !resendEmail}
                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendState === 'sending'
                      ? 'Sending…'
                      : 'Resend verification email'}
                  </button>
                </div>
              )}
            </div>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
