const PURSE_FORMATTERS = new Map()

function getPurseFormatter(currency) {
  const code = (currency || 'INR').toUpperCase()
  if (!PURSE_FORMATTERS.has(code)) {
    PURSE_FORMATTERS.set(
      code,
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }),
    );
  }
  return PURSE_FORMATTERS.get(code)
}

const COMPACT_FORMATTERS = new Map()

function getCompactFormatter(currency) {
  const code = (currency || 'INR').toUpperCase()
  if (!COMPACT_FORMATTERS.has(code)) {
    COMPACT_FORMATTERS.set(
      code,
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    );
  }
  return COMPACT_FORMATTERS.get(code)
}

function formatPurse(amount, currency, { compact = false } = {}) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—'
  const formatter = compact
    ? getCompactFormatter(currency)
    : getPurseFormatter(currency)
  return formatter.format(amount)
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDateRange(start, end) {
  if (!start && !end) return 'Dates TBA'
  if (start && !end) return DATE_FORMATTER.format(new Date(start))
  if (!start && end) return DATE_FORMATTER.format(new Date(end))
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth()
  ) {
    const monthFmt = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      year: 'numeric',
    })
    return `${startDate.getDate()}–${endDate.getDate()} ${monthFmt.format(
      startDate,
    )}`
  }
  return `${DATE_FORMATTER.format(startDate)} → ${DATE_FORMATTER.format(endDate)}`
}

export { formatPurse, formatDateRange }
