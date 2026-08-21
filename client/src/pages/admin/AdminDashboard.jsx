import { useAuth } from '../../auth'

// Placeholder — populated with totals and the sold-value chart in the
// dashboard step.
export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Admin dashboard coming in a later step.</p>
    </div>
  )
}
