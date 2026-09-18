import { useState } from 'react'

const initialsFor = (name) => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
}

function PlayerImage({ src, name, imageClassName, fallbackClassName, alt = '' }) {
  const [failedSrc, setFailedSrc] = useState('')
  const showImage = Boolean(src) && failedSrc !== src

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt}
        className={imageClassName}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    )
  }

  return <span className={fallbackClassName}>{initialsFor(name)}</span>
}

export default PlayerImage
