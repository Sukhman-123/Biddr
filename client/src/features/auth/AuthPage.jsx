import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Gavel,
  MonitorUp,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { AUTH_MODES } from './auth.constants'
import { getPasswordStrength } from './auth.utils'
import {
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
} from './auth.validation'
import { forgotPasswordRequest, resetPasswordRequest } from './auth.api'
import { useAuth } from './useAuth'
import AuthBrand from './components/AuthBrand'
import AuthTabs from './components/AuthTabs'
import ForgotPasswordForm from './components/ForgotPasswordForm'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import ResetPasswordForm from './components/ResetPasswordForm'
import './AuthPage.css'

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  identifier: '',
  password: '',
  confirmPassword: '',
}

const EMPTY_ERRORS = {}

const modeFromPath = (pathname) => {
  if (pathname === '/register') return AUTH_MODES.REGISTER
  if (pathname === '/forgot-password') return AUTH_MODES.FORGOT_PASSWORD
  if (pathname === '/reset-password') return AUTH_MODES.RESET_PASSWORD
  return AUTH_MODES.LOGIN
}

const pathFromMode = (mode) => {
  if (mode === AUTH_MODES.REGISTER) return '/register'
  if (mode === AUTH_MODES.FORGOT_PASSWORD) return '/forgot-password'
  if (mode === AUTH_MODES.RESET_PASSWORD) return '/reset-password'
  return '/login'
}

const cardCopyByMode = {
  [AUTH_MODES.LOGIN]: {
    eyebrow: 'Welcome back',
    title: 'Sign in to Biddr',
    copy: 'Access your auction rooms, admin setup, and presenter screens.',
  },
  [AUTH_MODES.REGISTER]: {
    eyebrow: 'Create your auction desk',
    title: 'Start your tournament room',
    copy: 'Create an account to configure teams, players, and live auction controls.',
  },
  [AUTH_MODES.FORGOT_PASSWORD]: {
    eyebrow: 'Password help',
    title: 'Reset your password',
    copy: 'Enter your account email and we will prepare a secure reset link.',
  },
  [AUTH_MODES.RESET_PASSWORD]: {
    eyebrow: 'Secure reset',
    title: 'Choose a new password',
    copy: 'Create a fresh password to regain access to your auction rooms.',
  },
}

function AuthPage() {
  const { isAuthenticated, isLoading, login, loginWithGoogle, register } =
    useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = location.state?.next || '/home'

  // Mode is derived from the URL — no separate state needed. Clicking a tab
  // navigates between /login and /register and the form re-renders for that
  // mode. Visiting either URL directly (e.g. from the landing page) lands on
  // the correct screen.
  const mode = modeFromPath(location.pathname)
  const isRegister = mode === AUTH_MODES.REGISTER
  const isForgotPassword = mode === AUTH_MODES.FORGOT_PASSWORD
  const isResetPassword = mode === AUTH_MODES.RESET_PASSWORD
  const showAuthTabs = mode === AUTH_MODES.LOGIN || mode === AUTH_MODES.REGISTER
  const resetToken = searchParams.get('token') || ''
  const cardCopy = cardCopyByMode[mode] ?? cardCopyByMode[AUTH_MODES.LOGIN]

  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [serverError, setServerError] = useState(null)
  const [resetResult, setResetResult] = useState(null)
  const [resetComplete, setResetComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const strength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password],
  )

  useEffect(() => {
    document.body.classList.add('auth-route-active')
    return () => {
      document.body.classList.remove('auth-route-active')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="biddr-stage">
        <div className="biddr-grid" aria-hidden="true" />
        <div className="biddr-glow" aria-hidden="true" />
        <header className="biddr-header">
          <AuthBrand />
        </header>
        <main className="biddr-main biddr-main--center">
          <div
            className="auth-card auth-card--splash"
            role="status"
            aria-live="polite"
          >
            <span className="splash-spinner" aria-hidden="true" />
            <p>Warming up the auction floor…</p>
          </div>
        </main>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={nextPath} replace />
  }

  const updateField = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    if (serverError) setServerError(null)
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    // Reset transient UI on the next render (derives from URL change).
    setForm(initialForm)
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setResetResult(null)
    setResetComplete(false)
    setShowPassword(false)
    navigate(pathFromMode(nextMode), { replace: true })
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const nextErrors = validateLogin(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setIsSubmitting(true)
    try {
      const identifier = form.identifier.trim()
      await login({
        identifier: identifier.includes('@')
          ? identifier.toLowerCase()
          : identifier,
        password: form.password,
      })
      setForm(initialForm)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    const nextErrors = validateRegister(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setIsSubmitting(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      })
      setForm(initialForm)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    const nextErrors = validateForgotPassword(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setResetResult(null)
    setIsSubmitting(true)
    try {
      const data = await forgotPasswordRequest(form.email.trim().toLowerCase())
      setResetResult(data)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!resetToken) {
      setServerError('Reset link is missing a token. Request a new reset link.')
      return
    }
    const nextErrors = validateResetPassword(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setIsSubmitting(true)
    try {
      await resetPasswordRequest({
        token: resetToken,
        password: form.password,
      })
      setResetComplete(true)
      setForm(initialForm)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleCredential = async (idToken) => {
    if (isGoogleLoading || isSubmitting) return
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle(idToken)
      setForm(initialForm)
    } catch (err) {
      setServerError(err.message || 'Google sign-in failed')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleGoogleError = (error) => {
    if (!error) return
    setServerError(error.message || 'Google sign-in failed')
  }

  return (
    <div className="biddr-stage">
      <div className="biddr-grid" aria-hidden="true" />
      <div className="biddr-glow" aria-hidden="true" />

      <main className="biddr-main">
        <motion.aside
          className="auth-side-panel"
          aria-label="Biddr auction highlights"
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-side-top">
            <AuthBrand size={34} />
          </div>
          <div className="auth-orbit-card" aria-hidden="true">
            <div className="auth-orbit-ring" />
            <div className="auth-orbit-ring auth-orbit-ring--inner" />
            <span className="auth-orbit-dot" />
            <div className="auth-orbit-center">
              <Gavel size={30} />
            </div>
            <span className="auth-orbit-chip auth-orbit-chip--one">
              <Gavel size={16} />
              Auctioneer control
            </span>
            <span className="auth-orbit-chip auth-orbit-chip--two">
              <MonitorUp size={16} />
              Presenter view
            </span>
            <span className="auth-orbit-chip auth-orbit-chip--three">
              <Wallet size={16} />
              Purse checks
            </span>
            <span className="auth-orbit-chip auth-orbit-chip--four">
              <ShieldCheck size={16} />
              Role-safe rooms
            </span>
            <span className="auth-orbit-chip auth-orbit-chip--five">
              <Users size={16} />
              Team setup
            </span>
            <span className="auth-orbit-chip auth-orbit-chip--six">
              <Clock size={16} />
              Live pacing
            </span>
            <span className="auth-orbit-chip auth-orbit-chip--seven">
              <BadgeCheck size={16} />
              Fair bids
            </span>
          </div>
          <div className="auth-side-copy-wrap">
            <h1>
              <span>Build the room.</span>
              <strong>Run the bids.</strong>
            </h1>
            <p className="auth-side-copy">
              Auctioneer controls, purse-safe bidding, and presenter-ready rooms
              all wired for the biggest night of your tournament.
            </p>
          </div>
        </motion.aside>

        <motion.section
          className={isRegister ? 'auth-card auth-card--register' : 'auth-card'}
          aria-label="Authentication"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-card-brand">
            <AuthBrand size={36} />
          </div>
          <div className="auth-card-head">
            <span>{cardCopy.eyebrow}</span>
            <h2>{cardCopy.title}</h2>
            <p>{cardCopy.copy}</p>
          </div>

          {showAuthTabs ? <AuthTabs activeMode={mode} onChange={switchMode} /> : null}

          <AnimatePresence mode="wait" initial={false}>
            {isForgotPassword ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <ForgotPasswordForm
                  form={form}
                  errors={errors}
                  serverError={serverError}
                  isSubmitting={isSubmitting}
                  resetResult={resetResult}
                  onChange={updateField}
                  onModeChange={switchMode}
                  onSubmit={handleForgotPassword}
                />
              </motion.div>
            ) : isResetPassword ? (
              <motion.div
                key="reset-password"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <ResetPasswordForm
                  form={form}
                  passwordStrength={strength}
                  showPassword={showPassword}
                  errors={errors}
                  serverError={serverError}
                  resetComplete={resetComplete}
                  isSubmitting={isSubmitting}
                  onChange={updateField}
                  onModeChange={switchMode}
                  onSubmit={handleResetPassword}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                />
              </motion.div>
            ) : isRegister ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <RegisterForm
                  form={form}
                  passwordStrength={strength}
                  showPassword={showPassword}
                  errors={errors}
                  serverError={serverError}
                  isSubmitting={isSubmitting}
                  isGoogleLoading={isGoogleLoading}
                  onChange={updateField}
                  onModeChange={switchMode}
                  onSubmit={handleRegister}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  onGoogleCredential={handleGoogleCredential}
                  onGoogleError={handleGoogleError}
                />
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <LoginForm
                  form={form}
                  showPassword={showPassword}
                  errors={errors}
                  serverError={serverError}
                  isSubmitting={isSubmitting}
                  isGoogleLoading={isGoogleLoading}
                  onChange={updateField}
                  onModeChange={switchMode}
                  onSubmit={handleLogin}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  onGoogleCredential={handleGoogleCredential}
                  onGoogleError={handleGoogleError}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Link to="/" className="auth-back-home">
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </motion.section>
      </main>
    </div>
  )
}

export default AuthPage
