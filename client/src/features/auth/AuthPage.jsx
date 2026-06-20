import { useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
  franchise: '',
  email: '',
  password: '',
}

const EMPTY_ERRORS = {}

function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const nextPath = location.state?.next || '/tournaments'

  const [mode, setMode] = useState(AUTH_MODES.LOGIN)
  const [role, setRole] = useState('owner')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const { login, loginWithGoogle, register } = useAuth()

  const isRegister = mode === AUTH_MODES.REGISTER
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
        <main className="biddr-main">
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
    setMode(nextMode)
    setErrors(EMPTY_ERRORS)
    setServerError(null)
    setShowPassword(false)
    if (nextMode === AUTH_MODES.REGISTER && role === 'auctioneer') {
      setRole('owner')
    }
  }

  const handleRoleChange = (nextRole) => {
    setRole(nextRole)
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
      await login({
        email: form.email.trim().toLowerCase(),
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
        franchise: form.franchise.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
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
      await loginWithGoogle(idToken, isRegister ? role : undefined)
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

      <header className="biddr-header">
        <AuthBrand />
      </header>

      <main className="biddr-main">
        <motion.section
          className="auth-card"
          aria-label="Authentication"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
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
                  role={role}
                  passwordStrength={strength}
                  showPassword={showPassword}
                  errors={errors}
                  serverError={serverError}
                  isSubmitting={isSubmitting}
                  isGoogleLoading={isGoogleLoading}
                  onChange={updateField}
                  onRoleChange={handleRoleChange}
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
      </main>
    </div>
  )
}

export default AuthPage
