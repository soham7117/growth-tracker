import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="center-note">
      <h1>Page not found</h1>
      <p className="sub">That page doesn't exist. It may have been moved.</p>
      <p>
        <Link className="btn" to="/">
          Back to the dashboard
        </Link>
      </p>
    </div>
  )
}
