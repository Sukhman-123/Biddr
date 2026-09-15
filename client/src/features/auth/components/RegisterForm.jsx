import { ArrowRight, LoaderCircle, Mail, Phone, UserRound } from 'lucide-react'
import { AUTH_MODES } from '../auth.constants'
import AuthLegal from './AuthLegal'
import FormError from './FormError'
import FormField from './FormField'
import PasswordField from './PasswordField'
import PasswordStrength from './PasswordStrength'
import SocialAuthButtons from './SocialAuthButtons'

function RegisterForm({
  errors = {},
  form,
  isGoogleLoading = false,
  isSubmitting = false,
  onChange,
  onGoogleCredential,
  onGoogleError,
  onModeChange,
  onSubmit,
  onTogglePassword,
  passwordStrength,
  serverError,
  showPassword,
}) {
  const busy = isSubmitting || isGoogleLoading

  return (
    <form
      id="auth-panel"
      className="auth-form login-form register-form"
      onSubmit={onSubmit}
      aria-busy={busy}
      noValidate
    >
      <FormError message={serverError} />

      <div className="register-fields">
        <FormField
          id="fullName"
          label="Full name"
          autoComplete="name"
          readOnly={busy}
          placeholder="Your full name"
          value={form.fullName}
          onChange={onChange('fullName')}
          error={errors.fullName}
          icon={<UserRound size={18} />}
        />

        <FormField
          id="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={busy}
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange('email')}
          error={errors.email}
          icon={<Mail size={18} />}
        />

        <FormField
          id="phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          readOnly={busy}
          placeholder="+91 98765 43210"
          value={form.phone}
          onChange={onChange('phone')}
          error={errors.phone}
          icon={<Phone size={18} />}
        />

        <div className="register-password-field">
          <PasswordField
            autoComplete="new-password"
            readOnly={busy}
            placeholder="At least 8 characters"
            value={form.password}
            showPassword={showPassword}
            onChange={onChange('password')}
            onToggleVisibility={onTogglePassword}
            error={errors.password}
          />
          <PasswordStrength strength={passwordStrength} />
        </div>
      </div>

      <button type="submit" className="cta-btn" disabled={busy}>
        <span className="cta-btn-content">
          {busy ? <LoaderCircle className="login-spinner" size={18} aria-hidden="true" /> : null}
          {isSubmitting
            ? 'Creating your account…'
            : isGoogleLoading
              ? 'Connecting to Google…'
              : 'Create account'}
          {!busy ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </span>
      </button>

      <span className="login-status" role="status">
        {isSubmitting ? 'Creating your Biddr account. Please wait.' : ''}
      </span>

      <SocialAuthButtons
        isGoogleLoading={busy}
        onGoogleCredential={onGoogleCredential}
        onGoogleError={onGoogleError}
      />

      <p className="switch-copy">
        Already have an account?{' '}
        <button
          type="button"
          className="link-btn"
          disabled={busy}
          onClick={() => onModeChange(AUTH_MODES.LOGIN)}
        >
          Sign in
        </button>
      </p>

      <AuthLegal />
    </form>
  )
}

export default RegisterForm
