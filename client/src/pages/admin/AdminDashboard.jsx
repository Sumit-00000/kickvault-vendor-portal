import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

const SERIES_COLOR = '#2a78d6'

export default function AdminDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/dashboard/admin', { token })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Admin dashboard</h2>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <span className="stat-label">Total vendors</span>
          <span className="stat-value">{data.totalVendors}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Live listings</span>
          <span className="stat-value">{data.liveListings}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Sold value</span>
          <span className="stat-value">{data.soldValue}</span>
          <span className="stat-sub">from non-cancelled invoices</span>
        </div>
      </div>

      <div className="card chart-card">
        <h3>Sold value over time</h3>
        {data.soldOverTime.length === 0 ? (
          <p className="muted">No sold value recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.soldOverTime}
              margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke="#e9ecef" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e3e6ea' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                formatter={(value) => [value, 'Sold value']}
                contentStyle={{
                  border: '1px solid #e3e6ea',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="value"
                name="Sold value"
                fill={SERIES_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
