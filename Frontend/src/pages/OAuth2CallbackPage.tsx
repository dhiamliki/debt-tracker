import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, XCircle } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'

/**
 * Landing page for the backend OAuth2 redirect. Spring sends the user here with
 * either ?token=JWT on success or ?error=... on failure.
 */
export default function OAuth2CallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [failed, setFailed] = useState(false)

  // StrictMode runs effects twice in dev — only act once.
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (token && !error) {
      localStorage.setItem('token', token)
      navigate('/dashboard', { replace: true })
    } else {
      setFailed(true)
    }
  }, [searchParams, navigate])

  if (!failed) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
          <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Signing you in…
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Hold tight while we complete your sign-in.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
          <XCircle className="h-9 w-9 text-red-600 dark:text-red-400" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Login failed. Please try again.
        </h1>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
