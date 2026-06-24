// =============================================================
// Render start-command shim.
// =============================================================
//
// Render's default Start Command for Node services is `node index.js`,
// and the path is resolved relative to the service's `rootDir`. With
// `rootDir: server` in render.yaml, Render looks for
// `/opt/render/project/src/server/index.js` — but our real entry is
// `server/src/index.js`.
//
// Rather than force every Render dashboard setup to override the
// Start Command, this shim re-exports the real entry. That way:
//   - Render's default `node index.js` works as-is.
//   - `npm start` (used by render.yaml Blueprint) keeps working
//     because server/package.json's `start` script calls
//     `node src/index.js` directly.
//   - Local `cd server && node index.js` works too.
//
// If you ever move the entry, just update the require() path below.
// =============================================================

require('./src/index.js')