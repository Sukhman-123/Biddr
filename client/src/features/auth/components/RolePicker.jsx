import clsx from 'clsx'
import { ROLES } from '../auth.constants'

function RolePicker({ value, onChange }) {
  return (
    <div className="role-block">
      <p className="role-label">I am a...</p>
      <div
        className="role-grid role-grid--three"
        role="radiogroup"
        aria-label="Account role"
      >
        {ROLES.map((option) => {
          const selected = value === option.id

          return (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={selected}
              className={clsx('role-tile', { selected })}
              onClick={() => onChange(option.id)}
            >
              <span className="role-tile-icon" aria-hidden="true">
                <option.Icon size={22} strokeWidth={2} />
              </span>
              <span className="role-tile-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default RolePicker
