function FormField({
  autoComplete,
  children,
  icon,
  id,
  label,
  name = id,
  onChange,
  placeholder,
  type = 'text',
  value,
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
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
        />
        {children}
      </div>
    </div>
  )
}

export default FormField
