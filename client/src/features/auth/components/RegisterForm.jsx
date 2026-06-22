import { Mail, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
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
  return (
    <form id="auth-panel" className="auth-form" onSubmit={onSubmit} noValidate>
      <FormError message={serverError} />

      <div className="field-row">
        <FormField
          id="fullName"
          label="Full Name"
          autoComplete="name"
          placeholder="Rohit Sharma"
          value={form.fullName}
          onChange={onChange('fullName')}
          error={errors.fullName}
        />
      </div>

      <div className="field-row">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange('email')}
          error={errors.email}
          icon={<Mail size={18} />}
        />
      </div>

      <div className="field-row">
        <PasswordField
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={form.password}
          showPassword={showPassword}
          onChange={onChange('password')}
          onToggleVisibility={onTogglePassword}
          error={errors.password}
        />
        <PasswordStrength strength={passwordStrength} />
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
          {isSubmitting ? (
            'Setting up your account…'
          ) : (
            <>
              <Sparkles size={16} strokeWidth={2.4} />
              Create account
            </>
          )}
        </span>
      </motion.button>

      <SocialAuthButtons
        isGoogleLoading={isGoogleLoading}
        onGoogleCredential={onGoogleCredential}
        onGoogleError={onGoogleError}
      />

      <p className="switch-copy">
        Already have an account?{' '}
        <button
          type="button"
          className="link-btn"
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
