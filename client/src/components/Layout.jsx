import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

// Nav links per role — more are added as features are implemented.
const NAV = {
  vendor: [
    { to: '/vendor', label: 'Dashboard', end: true },
    { to: '/vendor/listings', label: 'Listings' },
    { to: '/vendor/mrns', label: 'MRNs' },
    { to: '/vendor/invoices', label: 'Invoices' },
    { to: '/vendor/kyc', label: 'KYC' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/inventory', label: 'Inventory' },
    { to: '/admin/mrns', label: 'MRNs' },
    { to: '/admin/invoices', label: 'Invoices' },
  ],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            KickVault <span className="brand-sub">Vendor Portal</span>
          </span>
          <nav className="nav">
            {(NAV[user.role] || []).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-user">
            <span className="badge">{user.role}</span>
            <span className="topbar-name">{user.name}</span>
            <button className="btn btn-small" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
