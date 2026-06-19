import { useEffect, useId, useRef, useState } from 'react'

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const GIS_TIMEOUT_MS = 8000

let loaderPromise = null
const initializedClients = new Set()

const loadGoogleIdentityServices = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is unavailable'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }

  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
    const onLoad = () => {
      if (window.google?.accounts?.id) resolve(window.google)
      else reject(new Error('Google Identity Services failed to load'))
    }
    const onError = () => {
      loaderPromise = null
      reject(new Error('Google Identity Services script failed to load'))
    }

    let script = existing
    if (!script) {
      script = document.createElement('script')
      script.src = GIS_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    setTimeout(() => {
      if (!window.google?.accounts?.id) {
        loaderPromise = null
        reject(new Error('Google Identity Services timed out'))
      }
    }, GIS_TIMEOUT_MS)
  })

  return loaderPromise
}

function GoogleSignInButton({ clientId, disabled, onCredential, onError }) {
  const buttonId = useId().replace(/:/g, '-')
  const buttonRef = useRef(null)
  const [status, setStatus] = useState(clientId ? 'loading' : 'error')
  const [loadError, setLoadError] = useState(
    clientId ? null : 'Google sign-in is not configured',
  )

  useEffect(() => {
    if (!clientId) return undefined

    let cancelled = false
    const slotNode = buttonRef.current
    const callback = (response) => {
      if (response?.credential) {
        onCredential?.(response.credential)
      } else {
        onError?.(new Error('Google did not return a credential'))
      }
    }

    const initialize = async () => {
      try {
        const google = await loadGoogleIdentityServices()
        if (cancelled) return

        if (!initializedClients.has(clientId)) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback,
            cancel_on_tap_outside: true,
          })
          initializedClients.add(clientId)
        }

        if (slotNode) {
          // Clear any previously rendered button so StrictMode's double-mount
          // does not stack two buttons on top of each other.
          slotNode.innerHTML = ''
          google.accounts.id.renderButton(slotNode, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          })
        }
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        const message = error?.message || 'Google sign-in failed to load'
        setLoadError(message)
        setStatus('error')
        onError?.(error)
      }
    }

    initialize()

    return () => {
      cancelled = true
      if (slotNode) {
        slotNode.innerHTML = ''
      }
    }
  }, [clientId, onCredential, onError])

  if (status === 'error' && loadError) {
    return (
      <div className="google-fallback" role="alert">
        {loadError}
      </div>
    )
  }

  return (
    <div
      id={buttonId}
      ref={buttonRef}
      className={`google-button-slot${disabled ? ' google-button-slot--disabled' : ''}${
        status === 'ready' ? '' : ' google-button-slot--loading'
      }`}
      aria-disabled={disabled || undefined}
      aria-busy={status !== 'ready' || undefined}
    />
  )
}

export default GoogleSignInButton
