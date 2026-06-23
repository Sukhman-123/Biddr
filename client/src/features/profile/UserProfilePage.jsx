import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock,
  Coins,
  Globe,
  Lock,
  LogOut,
  Medal,
  Palette,
  RefreshCw,
  Shield,
  Star,
  Trophy,
  Users as UsersIcon,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../auth/useAuth'
import { fetchUserStatsRequest } from './profile.api'
import { usePreferences } from './preferences'
import EditProfileModal from './EditProfileModal'
import './UserProfilePage.css'

const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  globe: Globe,
  lock: Lock,
  coins: Coins,
  calendar: CalendarDays,
  teams: UsersIcon,
  medal: Medal,
  sparkles: Star,
}

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
}

function UserProfilePage() {
  const { user, logout } = useAuth()
  const { preferences, update, reset } = usePreferences()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const {
    data,
    error,
  } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStatsRequest,
  })

  if (error) {
    return (
      <main className="profile-main">
        <div className="profile-error">
          <span className="profile-error-msg">{error.message}</span>
        </div>
      </main>
    )
  }

  const stats = data?.stats ?? {}
  const achievements = data?.achievements ?? []
  const activity = data?.activity ?? []
  const hosted = data?.hostedTournaments ?? []

  const totalPossible = achievements.length
  const earnedCount = achievements.filter((a) => a.earned).length
  const progressPct = totalPossible > 0 ? Math.round((earnedCount / totalPossible) * 100) : 0

  return (
    <main className="profile-main">
      {/* ---- Cover ---- */}
      <div
        className="profile-cover"
        style={{
          '--cover-from': preferences.accentColor,
          '--cover-to': `${preferences.accentColor}22`,
        }}
      >
        <div className="profile-cover-grid" aria-hidden="true" />
        <div className="profile-cover-glow" aria-hidden="true" />
      </div>

      {/* ---- Hero ---- */}
      <motion.div
        className="profile-hero"
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div
          className="profile-avatar-ring"
          style={{ '--ring-color': preferences.accentColor }}
        >
          <span className="profile-avatar">
            {getInitials(user?.fullName)}
          </span>
        </div>

        <div className="profile-hero-meta">
          <h1 className="profile-name">{user?.fullName || '—'}</h1>
          <span className="profile-email">{user?.email}</span>
          <span className="profile-since">
            <Clock size={12} />
            {user?.createdAt
              ? `Joined ${new Date(user.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}`
              : ''}
          </span>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="profile-edit-btn"
            onClick={() => setEditing(true)}
          >
            <BadgeCheck size={14} />
            Edit profile
          </button>
          <button type="button" className="profile-logout" onClick={logout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </motion.div>

      {/* ---- Stats ---- */}
      <motion.section
        className="profile-stats"
        custom={1}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        aria-label="Your stats"
      >
        <StatCard icon={<Trophy size={18} />} label="Tournaments" value={stats.hosted ?? 0} />
        <StatCard icon={<CircleDot size={18} />} label="Live" value={stats.live ?? 0} accent="#52e88e" />
        <StatCard icon={<Wallet size={18} />} label="Franchises" value={stats.totalFranchises ?? 0} />
        <StatCard icon={<CalendarDays size={18} />} label="Days active" value={stats.daysActive ?? 0} />
      </motion.section>

      {/* ---- Main two-column ---- */}
      <div className="profile-grid">
        {/* Left: Hosted + Activity */}
        <div className="profile-primary">
          {/* Badges */}
          <motion.section
            className="profile-section"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <header className="profile-section-head">
              <Award size={16} />
              <h2>Achievements</h2>
              <span className="profile-badge-progress">
                {earnedCount}/{totalPossible}
              </span>
            </header>
            <div className="profile-badge-ring-row">
              <ProgressRing pct={progressPct} />
              <div className="profile-badge-progress-label">{progressPct}% complete</div>
            </div>
            <ul className="profile-badge-grid">
              {achievements.map((ach) => {
                const Icon = ACHIEVEMENT_ICONS[ach.icon] ?? Award
                return (
                  <motion.li
                    key={ach.id}
                    className={clsx('profile-badge', { 'is-earned': ach.earned })}
                    whileHover={ach.earned ? { y: -2 } : {}}
                  >
                    <span className="profile-badge-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span className="profile-badge-label">{ach.label}</span>
                    <span className="profile-badge-desc">{ach.description}</span>
                  </motion.li>
                )
              })}
            </ul>
          </motion.section>

          {/* Hosted tournaments */}
          <motion.section
            className="profile-section"
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <header className="profile-section-head">
              <Shield size={16} />
              <h2>Your tournaments</h2>
              {hosted.length > 0 ? (
                <Link to="/tournaments" className="profile-section-link">
                  All <ChevronRight size={14} />
                </Link>
              ) : null}
            </header>
            {hosted.length === 0 ? (
              <p className="profile-empty">No tournaments yet — create your first one.</p>
            ) : (
              <ul className="profile-hosted-grid">
                {hosted.map((t) => (
                  <motion.li
                    key={t.id}
                    className="profile-hosted-card"
                    whileHover={{ y: -2 }}
                  >
                    <Link to={`/tournaments/${t.id}`} className="profile-hosted-link">
                      <div
                        className="profile-hosted-accent"
                        style={{ '--accent': preferences.accentColor }}
                      />
                      <span className="profile-hosted-code">{t.shortCode}</span>
                      <span className="profile-hosted-name">{t.name}</span>
                      <span
                        className={clsx('profile-hosted-status', {
                          'is-live': t.status === 'live',
                          'is-upcoming': t.status === 'upcoming',
                          'is-completed': t.status === 'completed',
                        })}
                      >
                        <CircleDot size={10} />
                        {t.status}
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* Activity timeline */}
          <motion.section
            className="profile-section"
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <header className="profile-section-head">
              <Clock size={16} />
              <h2>Recent activity</h2>
            </header>
            {activity.length === 0 ? (
              <p className="profile-empty">No activity yet.</p>
            ) : (
              <ol className="profile-timeline">
                {activity.map((event) => (
                  <li key={event.id} className="profile-timeline-item">
                    <span className="profile-timeline-dot" />
                    <div className="profile-timeline-body">
                      <span className="profile-timeline-title">{event.title}</span>
                      <span className="profile-timeline-sub">{event.subtitle}</span>
                    </div>
                    <time className="profile-timeline-time">
                      {new Date(event.at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </motion.section>
        </div>

        {/* Right sidebar: preferences + info */}
        <aside className="profile-sidebar">
          <motion.section
            className="profile-section profile-preferences"
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <header className="profile-section-head">
              <Palette size={16} />
              <h2>Preferences</h2>
            </header>

            <PreferenceRow
              label="Accent color"
              control={
                <input
                  type="color"
                  value={preferences.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="profile-color-input"
                />
              }
            />

            <PreferenceRow
              label="Compact cards"
              control={
                <Toggle
                  checked={preferences.compactCards}
                  onChange={(e) => update({ compactCards: e.target.checked })}
                />
              }
            />

            <PreferenceRow
              label="Bid notifications"
              control={
                <Toggle
                  checked={preferences.notifyOnBid}
                  onChange={(e) => update({ notifyOnBid: e.target.checked })}
                />
              }
            />

            <PreferenceRow
              label="New room alerts"
              control={
                <Toggle
                  checked={preferences.notifyOnNewRoom}
                  onChange={(e) => update({ notifyOnNewRoom: e.target.checked })}
                />
              }
            />

            <PreferenceRow
              label="Email digest"
              control={
                <select
                  value={preferences.emailDigest}
                  onChange={(e) => update({ emailDigest: e.target.value })}
                  className="profile-select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="off">Off</option>
                </select>
              }
            />

            <button
              type="button"
              className="profile-reset-preferences"
              onClick={reset}
            >
              <RefreshCw size={13} />
              Reset preferences
            </button>
          </motion.section>

          <motion.section
            className="profile-section profile-about-card"
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <header className="profile-section-head">
              <Shield size={16} />
              <h2>About</h2>
            </header>
            <ul className="profile-about-list">
              <li>
                <span className="profile-about-label">Account</span>
                <span className="profile-about-value">{user?.authProvider === 'google' ? 'Google' : 'Email & password'}</span>
              </li>
              <li>
                <span className="profile-about-label">Member since</span>
                <span className="profile-about-value">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </li>
              <li>
                <span className="profile-about-label">Tournaments hosted</span>
                <span className="profile-about-value">{stats.hosted ?? 0}</span>
              </li>
              <li>
                <span className="profile-about-label">Invite-only</span>
                <span className="profile-about-value">{stats.inviteOnly ?? 0}</span>
              </li>
              <li>
                <span className="profile-about-label">Total purse</span>
                <span className="profile-about-value">
                  {stats.totalPurse
                    ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(stats.totalPurse)
                    : '—'}
                </span>
              </li>
            </ul>
          </motion.section>
        </aside>
      </div>
      {editing ? (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['user-stats'] })
            queryClient.invalidateQueries({ queryKey: ['auth-me'] })
            // Trigger a re-read of localStorage so the page's preferences hook updates.
            window.dispatchEvent(new Event('biddr:preferences-changed'))
            setEditing(false)
          }}
        />
      ) : null}
    </main>
  )
}

function StatCard({ icon, label, value, accent }) {
  return (
    <motion.div className="profile-stat-card" whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
      <span
        className="profile-stat-icon"
        style={accent ? { '--icon-accent': accent } : undefined}
      >
        {icon}
      </span>
      <span className="profile-stat-value">{value}</span>
      <span className="profile-stat-label">{label}</span>
    </motion.div>
  )
}

function ProgressRing({ pct }) {
  const r = 38
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  return (
    <svg viewBox="0 0 90 90" className="profile-progress-ring" aria-hidden="true">
      <circle cx="45" cy="45" r={r} className="profile-progress-track" />
      <circle
        cx="45"
        cy="45"
        r={r}
        className="profile-progress-fill"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          '--pct': pct,
        }}
      />
      <text x="45" y="45" className="profile-progress-text" textAnchor="middle" dominantBaseline="central">
        {pct}%
      </text>
    </svg>
  )
}

function PreferenceRow({ label, control }) {
  return (
    <div className="profile-pref-row">
      <span className="profile-pref-label">{label}</span>
      {control}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={clsx('profile-toggle', { 'is-on': checked })}
      onClick={() => onChange({ target: { checked: !checked } })}
    >
      <span className="profile-toggle-thumb" />
    </button>
  )
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default UserProfilePage
