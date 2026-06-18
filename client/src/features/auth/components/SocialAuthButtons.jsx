import { ShieldCheck } from 'lucide-react'

function SocialAuthButtons() {
  return (
    <>
      <div className="divider">
        <span>Or continue with</span>
      </div>

      <div className="alt-row">
        <button type="button" className="alt-btn" aria-label="Continue with Google">
          <span className="alt-btn-glyph" aria-hidden="true">
            G
          </span>
          <span>Google</span>
        </button>
        <button type="button" className="alt-btn" aria-label="Continue with SSO">
          <ShieldCheck size={18} />
          <span>SSO</span>
        </button>
      </div>
    </>
  )
}

export default SocialAuthButtons
