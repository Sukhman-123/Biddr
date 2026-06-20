import BrandMark from '../../../components/BrandMark'

function AuthBrand({ size = 30, compact = false }) {
  return (
    <div className={compact ? 'biddr-brand biddr-brand--compact' : 'biddr-brand'}>
      <BrandMark size={size} variant="full" className="biddr-brand-mark" />
    </div>
  )
}

export default AuthBrand