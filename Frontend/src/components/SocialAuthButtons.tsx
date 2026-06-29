/**
 * Open the backend OAuth2 endpoint in a popup and poll for the callback URL.
 * Once Spring redirects the popup to /oauth2/callback?token=JWT, grab the token,
 * store it and send the main window to the dashboard.
 */
const openOAuthPopup = (provider: 'google' | 'github') => {
  const url = `http://localhost:8080/oauth2/authorize/${provider}`
  const popup = window.open(url, 'oauth', 'width=500,height=600,scrollbars=yes')

  const interval = setInterval(() => {
    try {
      if (popup?.closed) {
        clearInterval(interval)
        return
      }
      const popupUrl = popup?.location?.href
      if (popupUrl?.includes('/oauth2/callback?token=')) {
        const token = new URL(popupUrl).searchParams.get('token')
        if (token) {
          localStorage.setItem('token', token)
          clearInterval(interval)
          popup?.close()
          window.location.href = '/dashboard'
        }
      }
    } catch {
      // Cross-origin — popup is still on the provider's domain, ignore.
    }
  }, 500)
}

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
          onClick={() => openOAuthPopup('google')}
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-slate-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          <GoogleIcon />
          Google
        </button>
        <button
          type="button"
          onClick={() => openOAuthPopup('github')}
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-slate-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
        >
          <GithubIcon />
          GitHub
        </button>
      </div>
    </>
  )
}
