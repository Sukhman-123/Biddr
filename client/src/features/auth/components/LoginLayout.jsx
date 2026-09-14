import { ArrowLeft, ArrowUpRight, Gavel, MonitorUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthBrand from './AuthBrand'
import './LoginLayout.css'

export default function LoginLayout({ children }) {
  return (
    <div className="login-page">
      <header className="login-header">
        <Link to="/" aria-label="Biddr home" className="login-brand">
          <AuthBrand size={30} />
        </Link>
        <Link to="/" className="login-home-link">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to home
        </Link>
      </header>

      <main className="login-main">
        <aside className="login-story" aria-label="About Biddr">
          <div className="login-story-content">
            <span className="login-eyebrow"><span /> THE GAME BEFORE THE GAME</span>
            <h2>Great teams<br />start with<br /><em>a winning bid.</em></h2>
            <p>Your players. Your teams. Your auction.<br />Bring every moment together in one room.</p>

            <div className="login-preview" aria-hidden="true">
              <div className="login-preview-top">
                <span><Gavel size={14} /> THE AUCTION ROOM</span>
                <span className="login-preview-label">Preview</span>
              </div>
              <div className="login-preview-player">
                <div className="login-paddle"><span>07</span></div>
                <div className="login-preview-copy">
                  <span>ONE PLAYER. A NEW POSSIBILITY.</span>
                  <strong>Make your next move.</strong>
                  <div className="login-preview-teams">
                    <span className="login-team-dot login-team-dot--blue" />
                    <span className="login-team-dot login-team-dot--gold" />
                    <span className="login-team-dot login-team-dot--green" />
                    <small>Every team has a game plan.</small>
                  </div>
                </div>
              </div>
              <div className="login-preview-bottom">
                <span>From the first bid to the final squad</span>
                <ArrowUpRight size={16} />
              </div>
            </div>

            <div className="login-story-features">
              <span><Gavel size={16} /> Host the room</span>
              <span><Users size={16} /> Build your squad</span>
              <span><MonitorUp size={16} /> Follow the action</span>
            </div>
          </div>
          <span className="login-story-foot">BUILT FOR CRICKET. MADE FOR YOUR LEAGUE.</span>
        </aside>

        <section className="login-form-panel" aria-labelledby="login-title">
          <div className="login-form-container">
            <div className="login-heading">
              <span className="login-eyebrow">WELCOME BACK</span>
              <h1 id="login-title">Sign in to Biddr.</h1>
              <p>Your next auction is waiting for you.</p>
            </div>
            {children}
          </div>
          <p className="login-panel-foot">For auctioneers, team owners, and fans.</p>
        </section>
      </main>
    </div>
  )
}
