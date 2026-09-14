# Biddr project review — 14 September 2026

Biddr is a substantial web MVP for running IPL-style cricket player auctions. The desktop interface is cohesive, and the main auction workflow operates locally. It is not yet ready to treat every feature as complete or to run an important live auction without addressing the data integrity and access-control issues below. The native mobile application is a separate foundation-stage project.

This assessment combines source review, the existing automated checks, Chrome rendering, browser login, and additional API/Socket.IO exercises against a disposable local MongoDB database. Production hosting, real email delivery, real Google sign-in, device-native mobile builds, and high-concurrency/load behavior were not verified. Application source was not changed as part of the review.

## Product and intended use

The target users are organizers of local leagues, clubs, colleges, corporate tournaments, and other cricket events that allocate players to franchises through an auction.

The intended journey is: create an account → create a tournament → configure franchises, purses, squad sizes, and bidding rules → add or import players → start the auction → bring one player onto the floor → accept bids → sell, pass, pause, or re-queue → review squads and export reports.

Two auction modes exist:

- **Physical:** the auctioneer records bids on behalf of teams gathered in a room.
- **Remote:** franchise owners submit bids from their devices, while the host controls player activation and final results.

The presenter view provides a separate audience/projector display with the current player, bid, clock, team budgets, and recent bidding information. Viewers must currently sign in; public tournament visibility does not provide an anonymous spectator route.

Account roles are `auctioneer` and `viewer`. Franchise ownership is a separate tournament-level membership. A viewer account can therefore be a team owner when assigned appropriately. Actual permissions depend heavily on tournament ownership and franchise membership, rather than just the account role label.

## Architecture

| Area | Implementation |
| --- | --- |
| Web client | React 19, Vite, React Router, TanStack Query, Axios, Framer Motion, Lucide icons |
| API | Express, Mongoose, JWT, bcrypt, Google token verification, Resend email integration |
| Real-time layer | Socket.IO authentication, tournament room subscriptions, broadcasts following REST mutations |
| Database | MongoDB; users, tournaments with embedded franchises/wallets/squads, player lots, invitations, and supporting models |
| Native mobile | Expo/React Native, TypeScript, Expo Router, secure token storage, API and socket client foundations |
| Deployment configuration | Netlify frontend rewrites and Render backend blueprint |

Feature folders make the client reasonably easy to navigate. Server routes, controllers, models, and services are separated. Some controllers and auction components are large and mix several responsibilities. Comments and documentation frequently describe earlier versions of behavior; the root README substantially understates what now exists.

## Functionality assessment

| Feature | Assessment and evidence |
| --- | --- |
| Registration, email/phone login, sessions, logout | Implemented; authentication suite passes and browser login succeeded against the local API. |
| Google login | Client and server integration exists; local screen says it is not configured. Real provider flow unverified. |
| Password reset | Token generation, expiry, reset handling, and email integration exist; tests pass. Real delivery unverified. |
| Home/dashboard and tournament browsing | Render with API data. Live-room indicators are not consistently connected to actual state. |
| Create/edit tournaments | Implemented with mode, dates, purse, currency, appearance, teams, and settings. Tests pass; screens render. |
| Public/private access and invitations | Implemented, but a listing filter bypass exposes private tournament summaries. Invitations are database access records; no invitation email dispatch was found. |
| Player pool | Manual creation/edit/delete, CSV/XLSX import and templates, search/filter support. Existing lot tests pass. |
| Franchise membership | Add/remove/role APIs exist. Add-by-email UI is a placeholder and does not call the mutation. This interrupts normal remote-owner onboarding. |
| Physical auction | Local API exercise verified activation, bidding, pause/resume, sale, purse deduction, and squad assignment. |
| Remote bidding | Owner authorization exists. A remote owner bid succeeded after assigning that owner through the API. Full onboarding through the UI is incomplete. |
| Wallet/squad guardrails | Balance and capacity validation exists and is tested. Undo corrupts squad membership in a reproduced normal workflow. |
| Undo/re-queue | Implemented, but undo has confirmed data integrity defects. Undo state is process memory, so it disappears on restart. |
| Real-time viewing | A separate authenticated Socket.IO client received activation, bid, pause, resume, hammer, and undo events. Presenter and room screens rendered. |
| Analytics/export | Summary metrics plus summary, squads, players, and bid-history CSV endpoints. Local summary CSV returned successfully. |
| Profile | Profile update and statistics exist. Several preference controls only save local settings without affecting application behavior. |
| Contact form | Broken: endpoint returns 404, while the UI's error handler displays success and clears the message. |
| Notifications and recap | “Notify me when live” and completed-auction recap buttons are disabled placeholders. |
| Native mobile | API health-check screen and infrastructure only. Native authentication, tournament, profile, and auction screens are not yet implemented. |

## Visual assessment

The dark backgrounds, gold accents, typography, cards, and clear action colors give the web app a consistent identity. The presenter screen is particularly appropriate for an auction event: the current bid dominates, while player and team information remain visible around it. Desktop authentication and the main dashboard are well composed.

Chrome rendered landing, login, registration, home, tournament listing, tournament creation, lobby, auction room, control room, presenter, analytics, and profile routes without uncaught page errors during the sampled visits. Desktop width was 1440px. Landing, login, home, and auction room were also checked at 390px, with no document-width overflow observed.

There are material usability issues:

- The mobile navigation drawer is visible while closed, covering the top of authenticated pages. The mobile CSS applies `display: flex` unconditionally and overrides the element's `hidden` behavior.
- The mobile auction host screen is very long: bidding, result controls, paddles, player queue, budgets, and feed are stacked. Important controls require substantial scrolling.
- The global header showed “0 rooms live” while the dashboard correctly showed a live tournament. `AppShell` defaults the count to zero and the router never supplies it.
- Currency formatting mixes compact `k/m`, full Indian digit grouping, and other compact forms. This deserves a consistent product decision for an India-focused auction tool.
- The presenter lot number displays `Lot --`; it looks for sequence fields that the lot model/response does not supply.

## Confirmed defects to fix first

1. **Sale undo leaves players in the squad and allows duplicates.** Sell a player, undo, and inspect the franchise: spending returns to zero, but the player's ID stays in `squad.playerIds`. Sell the same player again and its ID appears twice. The squad snapshot is shallow and retains the mutable player-ID array. Relevant code: `server/src/controllers/auctionRoom.controller.js:184` and `:579`. This can consume squad capacity incorrectly and invalidate reports.

2. **Undo accepts a different lot from the action being reversed.** After selling player A, calling `/api/lots/<player-B-id>/undo` returned 200 and copied A's previous name and auction state onto B, while A remained sold and the tournament wallet was restored. The endpoint loads the requested lot but does not require it to match the top undo action's `lotId`. Relevant code: `server/src/controllers/auctionRoom.controller.js:546`.

3. **Private tournament summaries leak through the visibility filter.** An uninvited account received 403 for private tournament detail, but `GET /api/tournaments?visibility=invite-only` returned that tournament's summary, including name, code, host, and purse. The visibility branch skips the owner/invitation restriction. Relevant code: `server/src/controllers/tournament.controller.js:31`.

4. **Auction lifecycle is not consistently enforced by mutation endpoints.** Activating a player before the tournament started returned 200. Creating/activating another lot after completion also succeeded, followed by a successful remote bid. UI gating alone does not protect completed auction data. Relevant code: `server/src/controllers/auctionRoom.controller.js:71` and `:255`.

5. **Franchise onboarding is unfinished.** `FranchiseMembers.jsx:74` accepts an email but only shows a “coming soon” toast. The backend expects a user ID. Complete lookup/assignment and verify the host → owner assignment → owner login → bid journey.

6. **Contact submissions are silently lost.** `/api/contact` is not mounted in `server/src/index.js`. The contact files also use ES-module syntax while the server uses CommonJS. `client/src/features/landing/LandingPage.jsx:313` treats every request failure as success.

7. **Mobile menu cannot reliably close visually.** Fix the conditional drawer display in `client/src/components/AppShell.css:345`, then check navigation and host controls on a phone-width viewport.

Additional issues: the first recorded bid is forced above base price because activation initializes `currentBid` to base price; profile bid/new-room notifications, email digest, and compact-card settings have no consumers outside profile/preferences; recap and notification buttons are incomplete. Clarify whether the opening-bid rule is intended before changing it.

## Verification results

| Check | Result |
| --- | --- |
| Web production build | Passed. Vite warned about a large JavaScript chunk: approximately 762 kB minified / 224 kB gzip; CSS approximately 230 kB / 39 kB gzip. |
| Frontend tests | 121 passed, 1 failed across 15 files. Failure is the PaddlesRail currency-copy expectation for `$3.0m`; it is a display/assertion issue, not evidence that bids fail. |
| Backend tests | 190 passed across 13 suites. The first sandboxed attempt could not open database ports; rerunning with local process access passed. |
| Frontend lint | 44 errors and 6 warnings, including React hook rules and unused declarations. |
| Browser | Login succeeded; sampled public and protected routes rendered without uncaught page errors. Mobile drawer defect observed. |
| Additional API/socket checks | Main physical workflow and remote bid after API ownership assignment passed; defects 1–4 and missing contact route were reproduced. |

The server tests commonly substitute a mock broadcaster; the separate socket exercise above provides additional evidence of real event delivery, but does not prove reliability under load, across reconnect races, or in production. The passing tests do not cover the confirmed edge cases sufficiently.

Root `npm test` only prints “No tests configured yet”; run the client/server suites explicitly. The machine's default Node is 18, while the server declares Node 20 and tooling requires newer versions. An available newer runtime was used for checks. Standardize supported development and deployment runtimes.

Other source-level reliability concerns to investigate after the confirmed defects: lot and tournament updates are separate saves without a transaction; bidding uses a read/check/save pattern without explicit optimistic concurrency enabled on the lot schema; undo state is limited to one process and is popped before restoration completes. These were not load-tested or failure-injected here.

## Suggested completion order

First fix undo integrity, private listing authorization, and tournament lifecycle enforcement, with regression tests for the reproduced cases. Then complete owner onboarding, contact delivery/error states, and the mobile menu. Next make the existing lint/test checks pass and wire them into a single root verification command and CI.

After that, validate a complete auction through separate host, owner, and viewer browser sessions, including reconnect, simultaneous bids, imports, reversal, completion, and all exports. Verify Google and email integrations in staging. Finish or clearly label the remaining settings, notifications, and recap features. Improve mobile host ergonomics and split route bundles before expanding native mobile scope.

The practical status is: **a credible, visually developed web MVP with working core flows and several release-blocking correctness gaps; native mobile remains at the infrastructure stage.**
