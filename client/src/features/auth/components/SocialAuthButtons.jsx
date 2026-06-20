import GoogleSignInButton from './GoogleSignInButton'
import { config } from '../../../lib/config'

function SocialAuthButtons({ isGoogleLoading = false, onGoogleCredential, onGoogleError }) {
  const hasGoogleClientId = Boolean(config.googleClientId)

  return (
    <>
      <div className="divider">
        <span>Or continue with</span>
      </div>

      <div className="alt-row alt-row--single">
        {hasGoogleClientId ? (
          <GoogleSignInButton
            clientId={config.googleClientId}
            disabled={isGoogleLoading}
            onCredential={onGoogleCredential}
            onError={onGoogleError}
          />
        ) : (
          <button
            type="button"
            className="alt-btn"
            disabled
            aria-label="Google sign-in not configured"
            title="Set VITE_GOOGLE_CLIENT_ID in client/.env to enable Google sign-in"
          >
            <span className="alt-btn-glyph" aria-hidden="true">
              G
            </span>
            <span>Google (not configured)</span>
          </button>
        )}
      </div>
    </>
  )
}

export default SocialAuthButtons
