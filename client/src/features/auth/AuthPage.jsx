import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Gavel, MonitorUp, ShieldCheck, Wallet } from 'lucide-react'
import { AUTH_MODES } from './auth.constants'
import { getPasswordStrength } from './auth.utils'
import { validateLogin, validateRegister } from './auth.validation'
import { useAuth } from './useAuth'
import AuthBrand from './components/AuthBrand'
import AuthTabs from './components/AuthTabs'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import './AuthPage.css'

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  identifier: '',
  password: '',
}

const EMPTY_ERRORS = {}

const modeFromPath = (pathname) =>
  pathname === '/register' ? AUTH_MODES.REGISTER : AUTH_MODES.LOGIN

function AuthPage() {
  const { isAuthenticated, isLoading, login, loginWithGoogle, register } =
    useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const nextPath = location.state?.next || '/home'

  // Mode is derived from the URL — no separate state needed. Clicking a tab
  // navigates between /login and /register and the form re-renders for that
  // mode. Visiting either URL directly (e.g. from the landing page) lands on
  // the correct screen.
  const mode = modeFromPath(location.pathname)
  const isRegister = mode === AUTH_MODES.REGISTER

  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const strength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password],
  )

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
    const target = nextMode === AUTH_MODES.REGISTER ? '/register' : '/login'
    // Reset transient UI on the next render (derives from URL change).
    setForm(initialForm)
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setShowPassword(false)
    navigate(target, { replace: true })
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
            <span className="auth-live-pill">Live auction ready</span>
          </div>
          <div className="auth-side-copy-wrap">
            <span className="auth-side-eyebrow">Auction room access</span>
            <h1>Sign in and take your place at the floor.</h1>
            <p className="auth-side-copy">
              Run physical or remote cricket auctions with auctioneer controls,
              purse-safe bids, and a polished presenter screen.
            </p>
          </div>
          <div className="auth-orbit-card" aria-hidden="true">
            <div className="auth-orbit-ring" />
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
          </div>
          <div className="auth-side-grid">
            <span>
              <ShieldCheck size={15} />
              Role-safe rooms
            </span>
            <span>
              <Wallet size={15} />
              Budget validation
            </span>
          </div>
        </motion.aside>

        <motion.section
          className="auth-card"
          aria-label="Authentication"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-card-brand">
            <AuthBrand size={36} />
          </div>
          <div className="auth-card-head">
            <span>{isRegister ? 'Create your auction desk' : 'Welcome back'}</span>
            <h2>{isRegister ? 'Start your tournament room' : 'Sign in to Biddr'}</h2>
            <p>
              {isRegister
                ? 'Create an account to configure teams, players, and live auction controls.'
                : 'Access your auction rooms, admin setup, and presenter screens.'}
            </p>
          </div>

          <AuthTabs activeMode={mode} onChange={switchMode} />

          <AnimatePresence mode="wait" initial={false}>
            {isRegister ? (
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
        </motion.section>

        <Link to="/" className="auth-back-home">
          <ArrowLeft size={14} />
          Back to home
        </Link>
      </main>
    </div>
  )
}

export default AuthPage
