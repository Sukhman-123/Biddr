import { Eye, EyeOff, Lock } from 'lucide-react'
import FormField from './FormField'

function PasswordField({
  autoComplete,
  error,
  id = 'password',
  label = 'Password',
  onChange,
  onToggleVisibility,
  placeholder,
  showPassword,
  value,
}) {
  return (
    <FormField
      id={id}
      label={label}
      type={showPassword ? 'text' : 'password'}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      error={error}
      icon={<Lock size={18} />}
    >
      <button
        type="button"
        className="input-action"
        onClick={onToggleVisibility}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </FormField>
  )
}

export default PasswordField
