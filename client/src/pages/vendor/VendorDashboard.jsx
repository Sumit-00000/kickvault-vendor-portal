import { useAuth } from '../../auth'

// Placeholder — populated with inventory, sold count, and pending payments
// in the dashboard step.
export default function VendorDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p className="muted">
        {user.businessName} — account status: <strong>{user.status}</strong>
      </p>
      <p>Vendor dashboard coming in a later step.</p>
    </div>
  )
}
