import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AUTH_MODES } from './auth.constants'
import { getPasswordStrength } from './auth.utils'
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

function AuthPage() {
  const [mode, setMode] = useState(AUTH_MODES.LOGIN)
  const [role, setRole] = useState('owner')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(initialForm)

  const isRegister = mode === AUTH_MODES.REGISTER
  const strength = useMemo(() => getPasswordStrength(form.password), [form.password])

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)

    if (nextMode === AUTH_MODES.REGISTER && role === 'auctioneer') {
      setRole('owner')
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
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

          {isRegister ? (
            <RegisterForm
              form={form}
              role={role}
              passwordStrength={strength}
              showPassword={showPassword}
              onChange={updateField}
              onRoleChange={setRole}
              onModeChange={switchMode}
              onSubmit={handleSubmit}
              onTogglePassword={() => setShowPassword((value) => !value)}
            />
          ) : (
            <LoginForm
              form={form}
              showPassword={showPassword}
              onChange={updateField}
              onModeChange={switchMode}
              onSubmit={handleSubmit}
              onTogglePassword={() => setShowPassword((value) => !value)}
            />
          )}
        </motion.section>
      </main>
    </div>
  )
}

export default AuthPage
