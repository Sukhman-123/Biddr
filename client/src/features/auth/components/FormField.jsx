function FormField({
  autoComplete,
  autoCapitalize,
  children,
  error,
  icon,
  id,
  inputMode,
  inputRef,
  label,
  name = id,
  onChange,
  placeholder,
  readOnly = false,
  spellCheck,
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
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          readOnly={readOnly}
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
