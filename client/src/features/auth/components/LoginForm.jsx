import { ArrowRight, LoaderCircle, Mail } from 'lucide-react'
import { AUTH_MODES } from '../auth.constants'
import AuthLegal from './AuthLegal'
import FormError from './FormError'
import FormField from './FormField'
import PasswordField from './PasswordField'
import SocialAuthButtons from './SocialAuthButtons'

function LoginForm({
  errors = {},
  isGoogleLoading = false,
  isSubmitting = false,
  onChange,
  onGoogleCredential,
  onGoogleError,
  onModeChange,
  onSubmit,
  onTogglePassword,
  serverError,
  showPassword,
  form,
}) {
  const busy = isSubmitting || isGoogleLoading

  return (
    <form id="auth-panel" className="auth-form login-form" onSubmit={onSubmit} aria-busy={busy} noValidate>
      <FormError message={serverError} />

      <div className="field-row">
        <FormField
          id="identifier"
          label="Email or phone"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={busy}
          placeholder="Email address or phone number"
          value={form.identifier}
          onChange={onChange('identifier')}
          error={errors.identifier}
          icon={<Mail size={18} />}
        />
      </div>

      <div className="field-row">
        <PasswordField
          autoComplete="current-password"
          placeholder="Enter your password"
          readOnly={busy}
          value={form.password}
          showPassword={showPassword}
          onChange={onChange('password')}
          onToggleVisibility={onTogglePassword}
          error={errors.password}
        />
      </div>

      <div className="auth-form-actions">
        <button
          type="button"
          className="link-btn"
          disabled={busy}
          onClick={() => onModeChange(AUTH_MODES.FORGOT_PASSWORD)}
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        className="cta-btn"
        disabled={busy}
      >
        <span className="cta-btn-content">
          {busy ? <LoaderCircle className="login-spinner" size={18} aria-hidden="true" /> : null}
          {isSubmitting ? 'Signing in…' : isGoogleLoading ? 'Connecting to Google…' : 'Sign in'}
          {!busy ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </span>
      </button>
      <span className="login-status" role="status">
        {isSubmitting ? 'Signing in. Your auction room will open shortly.' : ''}
      </span>

      <SocialAuthButtons
        isGoogleLoading={busy}
        onGoogleCredential={onGoogleCredential}
        onGoogleError={onGoogleError}
      />

      <p className="switch-copy">
        New to Biddr?{' '}
        <button
          type="button"
          className="link-btn"
          disabled={busy}
          onClick={() => onModeChange(AUTH_MODES.REGISTER)}
        >
          Create an account
        </button>
      </p>

      <AuthLegal />
    </form>
  )
}

export default LoginForm
