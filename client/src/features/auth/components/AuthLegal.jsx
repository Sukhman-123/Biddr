import { Link } from 'react-router-dom'

function AuthLegal() {
  return (
    <p className="legal-copy">
      By continuing you agree to Biddr&rsquo;s <Link to="/terms">Terms</Link> &amp;{' '}
      <Link to="/privacy">Privacy</Link>.
    </p>
  )
}

export default AuthLegal
