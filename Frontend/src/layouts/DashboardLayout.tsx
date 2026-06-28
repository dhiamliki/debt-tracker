import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-surface-50 text-slate-900">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-6">
        <Navbar />
        <Outlet />
      </main>
    </div>
  )
}
