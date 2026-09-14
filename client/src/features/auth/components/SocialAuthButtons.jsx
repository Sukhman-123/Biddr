import GoogleSignInButton from './GoogleSignInButton'
import { config } from '../../../lib/config'

function SocialAuthButtons({ isGoogleLoading = false, onGoogleCredential, onGoogleError }) {
  const hasGoogleClientId = Boolean(config.googleClientId)
  if (!hasGoogleClientId) return null

  return (
    <>
      <div className="divider">
        <span>Or continue with</span>
      </div>

      <div className="alt-row alt-row--single">
        <GoogleSignInButton
          clientId={config.googleClientId}
          disabled={isGoogleLoading}
          onCredential={onGoogleCredential}
          onError={onGoogleError}
        />
      </div>
    </>
  )
}

export default SocialAuthButtons
