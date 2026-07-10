import { Mail, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { AUTH_MODES } from '../auth.constants'
import FormError from './FormError'
import FormField from './FormField'

function ForgotPasswordForm({
  errors = {},
  form,
  isSubmitting = false,
  onChange,
  onModeChange,
  onSubmit,
  resetResult,
  serverError,
}) {
  return (
    <form id="auth-panel" className="auth-form" onSubmit={onSubmit} noValidate>
      <FormError message={serverError} />

      {resetResult ? (
        <div className="auth-reset-notice" role="status" aria-live="polite">
          <strong>Reset instructions ready</strong>
          <span>{resetResult.message}</span>
          {resetResult.resetUrl ? (
            <a href={resetResult.resetUrl}>Open reset link</a>
          ) : null}
        </div>
      ) : null}

      <div className="field-row">
        <FormField
          id="forgot-email"
          label="Account email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange('email')}
          error={errors.email}
          icon={<Mail size={18} />}
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
          {isSubmitting ? (
            'Preparing reset…'
          ) : (
            <>
              <Send size={16} strokeWidth={2.4} />
              Send reset link
            </>
          )}
        </span>
      </motion.button>

      <p className="switch-copy">
        Remembered it?{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => onModeChange(AUTH_MODES.LOGIN)}
        >
          Back to sign in
        </button>
      </p>
    </form>
  )
}

export default ForgotPasswordForm
