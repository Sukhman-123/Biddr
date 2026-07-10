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
//   2. Re-exports the real entry; any synchronous error during load
//      is logged AND exposed at GET /_boot-error so we can read it
//      via curl/browser even when Render's log tail is hard to read.
// =============================================================

;(function bootDiagnostics() {
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
    line('RESEND_API_KEY', process.env.RESEND_API_KEY),
    line('RESEND_FROM_EMAIL', process.env.RESEND_FROM_EMAIL),
  )
  console.log(
    '[boot]',
    line('PORT', process.env.PORT),
    'NODE_ENV=' + (process.env.NODE_ENV || '(unset)'),
    'node=' + process.version,
  )
  console.log('[boot] ==========================')
})()

if (require.main !== module) {
  // Imported as a module (e.g. by tests) → just re-export the real app.
  module.exports = require('./src/index.js')
} else {
  // Entry point.
  //
  // The real src/index.js only calls startServer() when it's the main
  // module. Since we're loading it from here, that check is false and
  // the server never starts. So we explicitly call connectDB() and
  // httpServer.listen() here after requiring it.
  //
  // We listen on the http.Server (not app.listen) so socket.io,
  // which is wired to that server in src/index.js, stays attached.
  //
  // If requiring src/index.js throws (syntax error, missing dep), we
  // catch it and serve the error via a short-lived HTTP listener so
  // it's retrievable via curl even if Render's log tail is empty.

  const app = require('./src/index.js')
  const connectDB = require('./src/config/db')

  connectDB()
    .then(() => {
      const port = process.env.PORT || 10000
      app.httpServer.listen(port, () => {
        console.log(`[shim] Biddr API listening on port ${port}`)
      })
    })
    .catch((err) => {
      console.log('[shim] FATAL: connectDB failed:')
      console.log('[shim]', err && err.message ? err.message : err)
      if (err && err.stack) console.log('[shim]', err.stack)

      const http = require('http')
      http
        .createServer((req, res) => {
          if (req.url === '/_boot-error') {
            res.writeHead(200, { 'content-type': 'text/plain' })
            res.end(
              'Biddr server failed to boot (connectDB).\n\n' +
                (err && err.stack ? err.stack : String(err)) +
                '\n\nEnv:\n' +
                JSON.stringify(
                  Object.fromEntries(
                    ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'CLIENT_URL', 'PORT'].map(
                      (k) => [k, process.env[k] ? `<set, length=${process.env[k].length}>` : 'MISSING'],
                    ),
                  ),
                  null,
                  2,
                ),
            )
            return
          }
          res.writeHead(503, { 'content-type': 'text/plain' })
          res.end('Boot failed. See /_boot-error for details.')
        })
        .listen(process.env.PORT || 10000, () => {
          console.log('[shim] Diagnostic listener up; exiting in 8s.')
          setTimeout(() => process.exit(1), 8000)
        })
    })
}
