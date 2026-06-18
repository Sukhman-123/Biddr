import { Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { AUTH_MODES } from '../auth.constants'
import AuthLegal from './AuthLegal'
import FormField from './FormField'
import PasswordField from './PasswordField'
import SocialAuthButtons from './SocialAuthButtons'

function LoginForm({
  form,
  showPassword,
  onChange,
  onModeChange,
  onSubmit,
  onTogglePassword,
}) {
  return (
    <form id="auth-panel" className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="owner@franchise.com"
          value={form.email}
          onChange={onChange('email')}
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
        />
      </div>

      <motion.button
        type="submit"
        className="cta-btn"
        whileHover={{ y: -1 }}
        whileTap={{ y: 0, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <span className="cta-btn-shine" aria-hidden="true" />
        <span className="cta-btn-content">Enter Auction Room</span>
      </motion.button>

      <SocialAuthButtons />

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
