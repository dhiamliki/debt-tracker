import { Link, useLocation } from 'react-router-dom'

export default function ComingSoon() {
  const { pathname } = useLocation()
  const name = pathname.replace(/^\//, '').replace(/-/g, ' ') || 'This page'

  return (
    <section className="card">
      <h1 className="text-xl font-semibold capitalize text-slate-900">{name}</h1>
      <p className="mt-2 text-sm text-slate-600">
        This section is coming soon.
      </p>
      <Link to="/dashboard" className="btn-primary mt-4 inline-block">
        Back to dashboard
      </Link>
    </section>
  )
}
