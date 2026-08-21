// Colored badge for the status values defined by the assignment.
export default function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{status}</span>
}
