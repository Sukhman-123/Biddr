import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

function FormError({ message }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key="form-error"
          className="form-error"
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <AlertCircle size={16} strokeWidth={2.4} />
          <span>{message}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  )
}

export default FormError
