import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Settings, Sun, User } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { useDebtStore } from '@/store/debtStore'
import { cn } from '@/utils/cn'

/** Avatar button with a dropdown: account, dark mode, links, sign out. */
export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const displayName = useUserStore((s) => s.displayName)
  const email = useUserStore((s) => s.email)
  const darkMode = useDebtStore((s) => s.darkMode)
  const toggleDarkMode = useDebtStore((s) => s.toggleDarkMode)
  const initial = (displayName || email || 'U').charAt(0).toUpperCase()

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const signOut = () => {
    setOpen(false)
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  const itemClass =
    'flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-surface-50 dark:text-slate-200 dark:hover:bg-slate-700'
  const divider = 'border-t border-surface-100 dark:border-slate-700'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[220px] overflow-hidden rounded-xl border border-surface-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Signed in as
            </p>
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {email || displayName || 'User'}
            </p>
          </div>

          <div className={divider} />

          <button
            type="button"
            onClick={toggleDarkMode}
            className={cn(itemClass, 'w-full justify-between')}
          >
            <span className="flex items-center gap-2">
              {darkMode ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              Dark mode
            </span>
            <span
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                darkMode ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600',
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                  darkMode ? 'translate-x-[1.125rem]' : 'translate-x-1',
                )}
              />
            </span>
          </button>

          <div className={divider} />

          <Link to="/profile" onClick={() => setOpen(false)} className={itemClass}>
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Link
            to="/preferences"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Settings className="h-4 w-4" />
            Preferences
          </Link>

          <div className={divider} />

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
