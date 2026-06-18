import { Gavel } from 'lucide-react'

function AuthBrand() {
  return (
    <div className="biddr-brand">
      <span className="brand-circle" aria-hidden="true">
        <Gavel size={20} strokeWidth={2.2} />
      </span>
      <div className="brand-text">
        <span className="brand-name">BIDDR</span>
        <span className="brand-tagline">
          Live cricket auctions. Real-time bidding. Owners take the stage.
        </span>
      </div>
    </div>
  )
}

export default AuthBrand
