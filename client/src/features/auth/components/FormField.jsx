function FormField({
  autoComplete,
  children,
  error,
  icon,
  id,
  label,
  name = id,
  onChange,
  placeholder,
  type = 'text',
  value,
}) {
  const hasError = Boolean(error)
  const inputId = `${id}-error`

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div
        className={`input-wrap${hasError ? ' input-wrap--error' : ''}`}
        data-invalid={hasError || undefined}
      >
        {icon && (
          <span className="input-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? inputId : undefined}
        />
        {children}
      </div>
      {hasError && (
        <p id={inputId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField
