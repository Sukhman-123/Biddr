import clsx from 'clsx'
import './BrandMark.css'

/**
 * Biddr brand mark — the wordmark shown across the app.
 *
 * Inline SVG so it's sharp at every size, recolorable, and the gavel cutout
 * in the "B" scales naturally because it's part of the same <path> using
 * the even-odd fill rule.
 *
 * Variant "icon"  → just the stylized "B" with the gavel cutout (square)
 * Variant "full"  → the "B" + the letters "IDDR"
 */
function BrandMark({
  variant = 'full',
  size = 36,
  className,
}) {
  const height = size
  const width = variant === 'full' ? size * 2.6 : size
  const viewBox = variant === 'full' ? '0 0 220 72' : '0 0 72 72'

  return (
    <span
      className={clsx('brand-mark', `is-${variant}`, className)}
      role="img"
      aria-label="Biddr"
      style={{ height, width }}
    >
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bm-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff1c2" />
            <stop offset="35%" stopColor="#f5c969" />
            <stop offset="70%" stopColor="#cf8d20" />
            <stop offset="100%" stopColor="#8a5a14" />
          </linearGradient>
          <linearGradient id="bm-gold-soft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe7a3" />
            <stop offset="60%" stopColor="#e3a73a" />
            <stop offset="100%" stopColor="#a26a16" />
          </linearGradient>
        </defs>

        {/* Big stylized B with gavel cutout (negative space).
            The gavel head + handle are inner subpaths in the same path;
            evenodd fill rule creates the cutout. */}
        <path
          fill="url(#bm-gold)"
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M 4 6
            L 56 6
            C 64.5 6 70 12.5 70 21
            C 70 27.6 66.5 32.4 60.4 34.3
            C 67 35.8 71 41 71 48
            C 71 57 64 64 55 64
            L 4 64
            Z
            M 22 16
            L 30 16
            C 33.6 16 36 18 36 21
            C 36 24 33.6 26 30 26
            L 22 26
            Z
            M 22 30
            L 32 30
            C 36.2 30 39 32.4 39 36.5
            C 39 40.6 36.2 43 32 43
            L 22 43
            Z

            M 22 49
            L 30 49
            L 30 53
            L 41 51
            L 39 49
            L 36 49
            L 33 47
            L 30 46
            L 26 47
            Z
          "
        />

        {variant === 'full' && (
          <g fill="url(#bm-gold-soft)">
            {/* I */}
            <rect x="86" y="20" width="10" height="36" rx="1.5" />

            {/* D */}
            <path d="
              M 104 20
              L 119 20
              C 132 20 140 28 140 38
              C 140 48 132 56 119 56
              L 104 56
              Z
              M 114 28
              L 114 48
              L 118 48
              C 125 48 130 44 130 38
              C 130 32 125 28 118 28
              Z
            " />

            {/* D */}
            <path d="
              M 148 20
              L 163 20
              C 176 20 184 28 184 38
              C 184 48 176 56 163 56
              L 148 56
              Z
              M 158 28
              L 158 48
              L 162 48
              C 169 48 174 44 174 38
              C 174 32 169 28 162 28
              Z
            " />

            {/* R */}
            <path d="
              M 192 20
              L 207 20
              C 216 20 222 25 222 32
              C 222 37 220 41 215 43
              L 223 56
              L 211 56
              L 205 44
              L 202 44
              L 202 56
              L 192 56
              Z
              M 202 28
              L 202 37
              L 205 37
              C 209 37 211 35 211 32
              C 211 29 209 28 205 28
              Z
            " />
          </g>
        )}
      </svg>
    </span>
  )
}

export default BrandMark