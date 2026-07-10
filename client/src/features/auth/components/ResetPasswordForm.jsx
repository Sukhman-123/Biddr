import { CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { AUTH_MODES } from '../auth.constants'
import FormError from './FormError'
import PasswordField from './PasswordField'
import PasswordStrength from './PasswordStrength'

function ResetPasswordForm({
  errors = {},
  form,
  isSubmitting = false,
  onChange,
  onModeChange,
  onSubmit,
  onTogglePassword,
  passwordStrength,
  resetComplete,
  serverError,
  showPassword,
}) {
  if (resetComplete) {
    return (
      <div className="auth-form auth-reset-complete" role="status">
        <div className="success-badge">
          <CheckCircle2 size={28} />
        </div>
        <h3>Password reset</h3>
        <p>Your password has been updated. You can now sign in safely.</p>
        <button
          type="button"
          className="cta-btn"
          onClick={() => onModeChange(AUTH_MODES.LOGIN)}
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <form id="auth-panel" className="auth-form" onSubmit={onSubmit} noValidate>
      <FormError message={serverError} />

      <div className="field-row">
        <PasswordField
          autoComplete="new-password"
          placeholder="Create a new password"
          value={form.password}
          showPassword={showPassword}
          onChange={onChange('password')}
          onToggleVisibility={onTogglePassword}
          error={errors.password}
        />
        <PasswordStrength strength={passwordStrength} />
      </div>

      <div className="field-row">
        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={form.confirmPassword}
          showPassword={showPassword}
          onChange={onChange('confirmPassword')}
          onToggleVisibility={onTogglePassword}
          error={errors.confirmPassword}
        />
      </div>

      <motion.button
        type="submit"
        className="cta-btn"
        disabled={isSubmitting}
        aria-busy={isSubmitting || undefined}
        whileHover={isSubmitting ? undefined : { y: -1 }}
        whileTap={isSubmitting ? undefined : { y: 0, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <span className="cta-btn-shine" aria-hidden="true" />
        <span className="cta-btn-content">
          {isSubmitting ? 'Resetting password…' : 'Reset password'}
        </span>
      </motion.button>

      <p className="switch-copy">
        Need a new link?{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => onModeChange(AUTH_MODES.FORGOT_PASSWORD)}
        >
          Request again
        </button>
      </p>
    </form>
  )
}

export default ResetPasswordForm
