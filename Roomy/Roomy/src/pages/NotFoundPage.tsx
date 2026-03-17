import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
        Page not found
      </div>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        The page you requested does not exist.
      </div>
      <Link to="/">Go to dashboard</Link>
    </div>
  )
}
