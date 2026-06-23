import { Mail } from 'lucide-react'
import { motion } from 'framer-motion'
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
  return (
    <form id="auth-panel" className="auth-form" onSubmit={onSubmit} noValidate>
      <FormError message={serverError} />

      <div className="field-row">
        <FormField
          id="identifier"
          label="Email or phone"
          autoComplete="username"
          placeholder="you@example.com or +91 98765 43210"
          value={form.identifier}
          onChange={onChange('identifier')}
          error={errors.identifier}
          icon={<Mail size={18} />}
        />
      </div>

      <div className="field-row">
        <PasswordField
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          showPassword={showPassword}
          onChange={onChange('password')}
          onToggleVisibility={onTogglePassword}
          error={errors.password}
        />
      </div>

      <motion.button
        type="submit"
        className="cta-btn"
        disabled={isSubmitting || isGoogleLoading}
        aria-busy={isSubmitting || undefined}
        whileHover={isSubmitting || isGoogleLoading ? undefined : { y: -1 }}
        whileTap={isSubmitting || isGoogleLoading ? undefined : { y: 0, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <span className="cta-btn-shine" aria-hidden="true" />
        <span className="cta-btn-content">
          {isSubmitting ? 'Signing you in…' : 'Enter Auction Room'}
        </span>
      </motion.button>

      <SocialAuthButtons
        isGoogleLoading={isGoogleLoading}
        onGoogleCredential={onGoogleCredential}
        onGoogleError={onGoogleError}
      />

      <p className="switch-copy">
        New to Biddr?{' '}
        <button
          type="button"
          className="link-btn"
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
