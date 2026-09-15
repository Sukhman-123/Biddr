import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, Mail } from 'lucide-react'
import { AUTH_MODES } from '../auth.constants'
import FormError from './FormError'
import FormField from './FormField'

function ForgotPasswordForm({
  errors = {},
  form,
  isSubmitting = false,
  onChange,
  onEditEmail,
  onModeChange,
  onSubmit,
  resetResult,
  serverError,
}) {
  const confirmationRef = useRef(null)
  const emailRef = useRef(null)
  const wasConfirmed = useRef(false)

  useEffect(() => {
    if (resetResult) confirmationRef.current?.focus()
    else if (wasConfirmed.current) emailRef.current?.focus()
    wasConfirmed.current = Boolean(resetResult)
  }, [resetResult])

  if (resetResult) {
    return (
      <div className="login-form recovery-form">
        <div
          className="recovery-confirmation"
          ref={confirmationRef}
          tabIndex={-1}
          role="status"
        >
          <p>If an account is linked to</p>
          <strong>{form.email.trim().toLowerCase()}</strong>
          <p>you’ll receive an email with a link to reset your password.</p>
        </div>

        <p className="recovery-help">
          Allow a few minutes for the email to arrive, and check your spam folder too.
        </p>

        <button
          type="button"
          className="cta-btn"
          onClick={() => onModeChange(AUTH_MODES.LOGIN)}
        >
          <span className="cta-btn-content">
            <ArrowLeft size={17} aria-hidden="true" />
            Back to sign in
          </span>
        </button>

        <button type="button" className="link-btn recovery-return" onClick={onEditEmail}>
          Try again or use another email
        </button>

        {import.meta.env.DEV && resetResult.resetUrl ? (
          <p className="recovery-dev-link">
            Local development: <a href={resetResult.resetUrl}>Open reset link</a>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <form
      id="auth-panel"
      className="auth-form login-form recovery-form"
      onSubmit={onSubmit}
      aria-busy={isSubmitting}
      noValidate
    >
      <FormError message={serverError} />

      <div className="field-row">
        <FormField
          id="forgot-email"
          name="email"
          inputRef={emailRef}
          label="Account email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={isSubmitting}
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange('email')}
          error={errors.email}
          icon={<Mail size={18} />}
        />
      </div>

      <button type="submit" className="cta-btn" disabled={isSubmitting}>
        <span className="cta-btn-content">
          {isSubmitting ? (
            <LoaderCircle className="login-spinner" size={18} aria-hidden="true" />
          ) : null}
          {isSubmitting ? 'Requesting reset link…' : 'Send reset link'}
          {!isSubmitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </span>
      </button>

      <span className="login-status" role="status">
        {isSubmitting ? 'Requesting your password reset link. Please wait.' : ''}
      </span>

      <button
        type="button"
        className="link-btn recovery-return"
        disabled={isSubmitting}
        onClick={() => onModeChange(AUTH_MODES.LOGIN)}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to sign in
      </button>

      <p className="recovery-help">
        Use the email you signed up with, even if you usually sign in with your phone number.
      </p>
    </form>
  )
}

export default ForgotPasswordForm
