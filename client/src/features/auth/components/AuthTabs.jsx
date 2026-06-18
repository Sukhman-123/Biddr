import clsx from 'clsx'
import { AUTH_MODES } from '../auth.constants'

const tabs = [
  { id: AUTH_MODES.LOGIN, label: 'Sign In' },
  { id: AUTH_MODES.REGISTER, label: 'Register' },
]

function AuthTabs({ activeMode, onChange }) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Auth mode">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeMode === tab.id}
          aria-controls="auth-panel"
          className={clsx('auth-tab', { active: activeMode === tab.id })}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default AuthTabs
