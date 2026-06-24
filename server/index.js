// =============================================================
// Render start-command shim + boot-time diagnostics.
// =============================================================
//
// Render's default Start Command for Node services is `node index.js`,
// and the path is resolved relative to the service's `rootDir`. With
// `rootDir: server` in render.yaml, Render looks for
// `/opt/render/project/src/server/index.js` — but our real entry is
// `server/src/index.js`.
//
// This shim:
//   1. Logs a one-line summary of which env vars the process can see.
//      This is the fastest way to debug "did my Render dashboard env
//      vars actually reach the process?" — the line appears before
//      anything else can crash.
//   2. Re-exports the real entry.
//
// It is intentionally minimal so that even if `src/index.js` throws,
// the diagnostic lines above already ran and you can see exactly
// which key was missing in the Render logs.
// =============================================================

;(function bootDiagnostics() {
  // Only run when this file is the entrypoint (not when required as a
  // module by tests). require.main === module is true exactly when
  // node was told to run THIS file directly.
  if (require.main !== module) return

  const line = (key, val) => {
    if (val === undefined || val === null || val === '') return `${key}=MISSING`
    return `${key}=set(${String(val).length})`
  }

  console.log('[boot] === Biddr env probe ===')
  console.log(
    '[boot]',
    line('MONGO_URI', process.env.MONGO_URI),
    line('JWT_SECRET', process.env.JWT_SECRET),
    line('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
    line('CLIENT_URL', process.env.CLIENT_URL),
  )
  console.log(
    '[boot]',
    line('PORT', process.env.PORT),
    'NODE_ENV=' + (process.env.NODE_ENV || '(unset)'),
    'node=' + process.version,
  )
  console.log('[boot] ==========================')
})()

require('./src/index.js')