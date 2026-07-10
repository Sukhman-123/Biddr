import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthBrand from '../auth/components/AuthBrand'
import './LegalPage.css'

const UPDATED_ON = 'July 10, 2026'

const TERMS_SECTIONS = [
  {
    title: 'Using Biddr',
    body: 'Biddr helps tournament owners and auctioneers configure teams, players, bid rules, auction rooms, and presenter views. You agree to use the platform only for lawful tournament and auction operations.',
  },
  {
    title: 'Accounts and access',
    body: 'You are responsible for keeping your account credentials secure and for the actions taken from your account. Auctioneer controls should only be used by authorized tournament owners or operators.',
  },
  {
    title: 'Auction decisions',
    body: 'Auction results, bid entries, sold or unsold decisions, re-queues, team budgets, and squad updates are controlled by the auctioneer or tournament owner. Please verify important auction actions before saving or hammering a result.',
  },
  {
    title: 'Data accuracy',
    body: 'Biddr provides tools to manage tournament data, but the tournament owner remains responsible for checking team budgets, player details, rules, and final auction outcomes.',
  },
  {
    title: 'Availability',
    body: 'We work to keep the platform reliable, but live auction rooms may depend on your network, device, browser, and third-party services. Keep a manual backup process for critical physical auctions.',
  },
  {
    title: 'Changes',
    body: 'We may update these terms as Biddr evolves. Continued use of the platform after updates means you accept the latest version.',
  },
]

const PRIVACY_SECTIONS = [
  {
    title: 'Information we collect',
    body: 'We collect account details such as name, email, phone number, authentication information, and profile preferences. We also store tournament data such as teams, players, budgets, lots, bids, and auction results.',
  },
  {
    title: 'How we use information',
    body: 'We use your information to create accounts, secure access, run auction rooms, sync tournament updates, show presenter views, improve product reliability, and provide support.',
  },
  {
    title: 'Auction and tournament data',
    body: 'Tournament owners control the data they create inside Biddr. Auction activity may be visible to users who have access to the relevant room, admin panel, or presenter view.',
  },
  {
    title: 'Third-party sign in',
    body: 'If you use Google sign-in, we receive basic account information needed to authenticate you. Google handles its own data according to its policies.',
  },
  {
    title: 'Security',
    body: 'We use reasonable technical safeguards for account access and password reset flows. No online service is perfectly secure, so use strong passwords and limit admin access to trusted users.',
  },
  {
    title: 'Your choices',
    body: 'You can update account information from your profile where available. For removal or correction requests, contact the Biddr team with the account email and tournament details.',
  },
]

const PAGE_COPY = {
  terms: {
    icon: FileText,
    eyebrow: 'Legal',
    title: 'Terms of Service',
    subtitle:
      'The practical rules for using Biddr to create tournaments and conduct auction rooms.',
    sections: TERMS_SECTIONS,
  },
  privacy: {
    icon: ShieldCheck,
    eyebrow: 'Privacy',
    title: 'Privacy Policy',
    subtitle:
      'How Biddr handles account, tournament, and auction-room information.',
    sections: PRIVACY_SECTIONS,
  },
}

function LegalPage({ type = 'terms' }) {
  const page = PAGE_COPY[type] ?? PAGE_COPY.terms
  const Icon = page.icon

  return (
    <main className="legal-page">
      <div className="legal-page__grid" aria-hidden="true" />
      <div className="legal-page__glow legal-page__glow--one" aria-hidden="true" />
      <div className="legal-page__glow legal-page__glow--two" aria-hidden="true" />

      <section className="legal-shell">
        <header className="legal-hero">
          <Link to="/" className="legal-back">
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <AuthBrand size={36} />
          <div className="legal-hero__badge">
            <Icon size={18} />
            <span>{page.eyebrow}</span>
          </div>
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
          <span className="legal-updated">Last updated: {UPDATED_ON}</span>
        </header>

        <div className="legal-card">
          {page.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}

          <div className="legal-note">
            <strong>Important:</strong> These pages are a product-ready starting
            point. Please have your final Terms and Privacy Policy reviewed by a
            qualified legal professional before launch.
          </div>
        </div>
      </section>
    </main>
  )
}

export default LegalPage
