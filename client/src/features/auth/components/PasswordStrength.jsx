import clsx from 'clsx'
import { STRENGTH_LABELS } from '../auth.constants'

function PasswordStrength({ strength }) {
  const strengthLevel = strength === 0 ? 0 : strength
  const level = STRENGTH_LABELS[strengthLevel - 1] || ''

  return (
    <>
      <div className="strength-meter" aria-label="Password strength">
        {[0, 1, 2, 3].map((index) => {
          const filled = index < strengthLevel

          return (
            <span
              key={index}
              className={clsx('strength-bar', {
                filled,
                [level]: filled,
              })}
            />
          )
        })}
      </div>
      <p className="strength-hint">
        Use 8+ chars with a mix of letters, numbers &amp; symbols.
      </p>
    </>
  )
}

export default PasswordStrength
