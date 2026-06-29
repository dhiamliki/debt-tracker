import { useEffect, useRef, useState } from 'react'

/** Google "G" brand mark (lucide dropped brand icons). */
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75Z"
      />
    </svg>
  )
}

/** GitHub brand mark. */
function GithubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

/**
 * "Or continue with" divider plus Google / GitHub buttons. Each kicks off the
 * backend OAuth2 dance by navigating to its authorization endpoint; Spring
 * redirects back to /oauth2/callback with a token once the flow completes.
 */
export default function SocialAuthButtons() {
  // Setting a provider kicks off the OAuth flow in the effect below.
  const [provider, setProvider] = useState<'google' | 'github' | null>(null)

  // Refs survive re-renders so the effect cleanup can always reach them.
  const popupRef = useRef<Window | null>(null)
  const intervalRef = useRef<number | null>(null)
  const handlerRef = useRef<((event: MessageEvent) => void) | null>(null)

  useEffect(() => {
    if (!provider) return

    // Tear down the listener and the popup-watch interval. Idempotent so it's
    // safe to call from the token handler, the closed-popup check, and the
    // effect cleanup alike.
    const cleanup = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (handlerRef.current) {
        window.removeEventListener('message', handlerRef.current)
        handlerRef.current = null
      }
    }

    // Register the listener before opening the popup so we never miss the
    // token message. Keep listening (no { once: true }) so a stray message
    // can't consume the handler before the real token arrives.
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.token) {
        localStorage.setItem('token', event.data.token)
        cleanup()
        window.location.href = '/dashboard'
      }
    }
    handlerRef.current = handler
    window.addEventListener('message', handler)

    // Relative path so the request goes through the nginx proxy to the backend.
    const url = `/oauth2/authorize/${provider}`
    popupRef.current = window.open(
      url,
      'oauth',
      'width=500,height=600,scrollbars=yes',
    )

    // If the popup is closed without sending a token, the user cancelled —
    // stop watching and reset so the buttons can start a fresh attempt.
    intervalRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        cleanup()
        setProvider(null)
      }
    }, 500)

    // Runs on unmount or before re-running for a new provider — no leaks.
    return cleanup
  }, [provider])

  return (
    <>
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400 dark:text-slate-400">
          or continue with
        </span>
        <div className="h-px flex-1 bg-surface-200 dark:bg-slate-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setProvider('google')}
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-slate-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          <GoogleIcon />
          Google
        </button>
        <button
          type="button"
          onClick={() => setProvider('github')}
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-slate-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          <GithubIcon />
          GitHub
        </button>
      </div>
    </>
  )
}
