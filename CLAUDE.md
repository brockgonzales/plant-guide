# Brock's Plant Guide — Project Reference

## Project Overview

A digital plant care guide web app built so Brock's housemate can care for ~28 houseplants while Brock travels internationally. Brock can check in from abroad via the same app. The goal was a simple, photo-first interface that requires zero plant knowledge to follow.

**Live URL:** https://brockgonzales.github.io/plant-guide/
**GitHub repo:** https://github.com/brockgonzales/plant-guide
**Local root:** `/Users/brockgonzales/Documents/Claude/Projects/Plants/`

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite 5 | Fast dev, small bundle |
| Database | Firebase Firestore | Real-time sync across devices, no server |
| Hosting | GitHub Pages | Free, auto-deploys on push |
| CI/CD | GitHub Actions | Builds + deploys on every push to `main` |
| Styling | Vanilla CSS (no UI library) | Full control, no dependency overhead |
| Email | SendGrid (@sendgrid/mail) | Transactional email via Cloud Functions; single sender verified at brock.gonzales@gmail.com |
| Functions | Firebase Cloud Functions v2 | Scheduled daily notification + on-demand test email |

---

## Directory Structure

```
Plants/                              ← git repo root
├── CLAUDE.md                        ← this file
├── plant_care_guide.md              ← plant-by-plant care reference (non-app doc)
├── firebase.json                    ← Firebase project config (functions source + Node 22 runtime)
├── .firebaserc                      ← Firebase project alias (brocks-plant-guide)
├── .github/
│   └── workflows/
│       └── deploy.yml               ← GitHub Actions CI/CD (MUST be at repo root, not in plant-guide/)
├── .gitignore
├── functions/                       ← Firebase Cloud Functions
│   ├── index.js                     ← dailyWateringNotification + sendTestNotification
│   └── package.json                 ← @sendgrid/mail, firebase-admin, firebase-functions
└── plant-guide/                     ← Vite app source
    ├── public/
    │   └── images/                  ← plant photos: plant-1.jpg through plant-29.jpg
    ├── src/
    │   ├── App.jsx                  ← root: state, tab routing, admin auth lift
    │   ├── main.jsx
    │   ├── index.css                ← all styles, CSS custom properties
    │   ├── firebase.js              ← Firebase init, exports `db`
    │   ├── components/
    │   │   ├── Header.jsx           ← tabs (Today / All Plants) + admin gear icon
    │   │   ├── TodayTasks.jsx       ← due-plant cards, completed pills, water date rows
    │   │   ├── PlantGrid.jsx        ← all-plants card grid with status badges
    │   │   ├── PlantDetail.jsx      ← modal: full care info, watering log, edit button
    │   │   ├── AdminPanel.jsx       ← PIN-protected: add/edit plants, set trip, watering history
    │   │   └── TripBanner.jsx       ← "Day X of Y — Destination" banner
    │   ├── hooks/
    │   │   ├── usePlants.js         ← Firestore `plants` collection CRUD + real-time sync
    │   │   ├── useWateringLog.js    ← `wateringLog` collection: log, status, history editing
    │   │   ├── useTrip.js           ← `trips` collection: set/clear trip dates + housemate note
    │   │   └── useSettings.js       ← `settings/notifications` doc: email toggle + addresses
    │   └── data/
    │       └── initialPlants.js     ← seed data (run once), WATERING_METHODS map
    ├── vite.config.js               ← base: '/plant-guide/' — must match GitHub repo name
    ├── package.json
    └── .env.local                   ← local dev secrets (not committed)
```

---

## Deployment

### How it works
Every `git push` to `main` triggers GitHub Actions, which:
1. Installs npm dependencies (`plant-guide/`)
2. Runs `npm run build` with Firebase secrets injected as env vars
3. Uploads `plant-guide/dist/` as the Pages artifact
4. Deploys to `https://nbrs5fydfg-dot.github.io/plant-guide/`

### Critical configuration
- Vite `base` in `vite.config.js` **must** be `/plant-guide/` — this is the GitHub repo name. If the repo is ever renamed, both must change together.
- `deploy.yml` **must** live at `.github/workflows/deploy.yml` at the repo root. GitHub Actions does not look inside subdirectories.
- 7 secrets stored in GitHub repo Settings → Secrets → Actions:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_ADMIN_PIN`

### Deploy a change
```bash
cd /Users/brockgonzales/Documents/Claude/Projects/Plants
git add plant-guide/src/      # or specific files
git commit -m "description"
git push
```
GitHub Actions runs automatically. Check progress at: https://github.com/nbrs5fydfg-dot/plant-guide/actions

### After deploy — browser cache note
GitHub Pages sets long cache lifetimes on JS/CSS assets. If the live site looks stale after a green deploy, open an incognito window or use DevTools → right-click reload → "Empty Cache and Hard Reload."

---

## Key Architecture Decisions

**Admin auth state lifted to App.jsx** — `isAdmin` lives in App so the ✏️ Edit button in PlantDetail (a separate modal) is visible once the PIN is entered, even if AdminPanel is closed and reopened. AdminPanel calls `onAdminAuth()` on PIN success; clicking Edit in PlantDetail calls `handleEditPlant(plant)` which sets `adminDirectPlant` and opens AdminPanel directly in edit mode via lazy state initialization.

**`plant.nextWaterDate` override field** — Optional date string on each plant document. When set, `getWateringStatus` and `getNextWaterDate` use it instead of calculating from watering log. Auto-cleared in `handleLogWatering` when the plant is watered, so the schedule resumes normally.

**Watering log is Firestore, not plant-document state** — Each watering event is a separate `wateringLog` document (`{ plantId, wateredAt: Timestamp, wateredBy, note }`). `useWateringLog` subscribes with `onSnapshot` so changes (including history edits) propagate in real-time across all open devices.

**No router** — Single-page, tab-based navigation managed with `useState`. Deep links are not needed for this use case.

---

## Plant Inventory

28 active plants, numbered 1–29. Plant 5 (Prayer Plant) is deceased. Plant 18 was removed as a duplicate of Plant 9.

- Plants 1 & 2 — Raven ZZ Plants (hallway, south window)
- Plant 3 — Red Nerve Plant / Fittonia (kitchen, north window)
- Plant 4 — Cast Iron Plant, variegated (kitchen, north window)
- Plant 6 — Ripple Peperomia (living room, south + UV filter)
- Plant 7 — Zebra Plant / Aphelandra (kitchen, north window)
- Plant 8 — Dragon Tree / Dracaena (hallway, bright indirect)
- Plant 9 — White/green Nerve Plant / Fittonia (living room)
- Plant 10 — Black Rubber Plant / Ficus elastica 'Burgundy' (living room)
- Plant 11 — Stromanthe 'Triostar' (living room, northwest window)
- Plants 12 & 14 — Chinese Evergreen green/cream; Silver-blue Philodendron (hallway)
- Plant 13 — Chinese Evergreen white/silver, large (hallway, floor)
- Plant 15 — Snake Plant, variegated (hallway, south window)
- Plant 16 — Heartleaf Philodendron, trailing (hallway, south window)
- Plant 17 — Anthurium (hallway, bright indirect corner)
- Plant 19 — Corn Plant / Dracaena fragrans, ~20 years old (living room)
- Plant 20 — Variegated Rubber Plant 'Tineke' (living room)
- Plant 21 — Jade Plant (living room, northwest window)
- Plant 22 — Purple Passion (kitchen, north window)
- Plant 23 — Autograph Tree / Hoya (kitchen area)
- Plant 24 — Wandering Dude / Tradescantia (location TBD)
- Plant 25 — African Violet (location TBD)
- Plant 26 — Red Chinese Evergreen / Aglaonema 'Siam Aurora' (location TBD)
- Plant 27 — White/Cream Chinese Evergreen (location TBD)
- Plant 28 — Neon Pothos (kitchen, north window)
- Plant 29 — Philodendron 'Prince of Orange' (hallway, direct sun)

---

## Local Development

```bash
cd plant-guide
npm install       # first time only
npm run dev       # starts at localhost:5173
```

Requires a `.env.local` file in `plant-guide/` with the 7 Firebase + PIN variables (same keys as GitHub secrets).

---

## Session Log

### Session 1 — App conception and initial build (before 2026-06-27)

**What was built:**
- Full React + Vite + Firebase Firestore app from scratch
- `plant-guide/` directory with all components, hooks, data
- Initial plant data for Plants 1–27 seeded into Firestore via `initialPlants.js`
- Firebase project created and configured
- Today tab, All Plants tab, Plant Detail modal, Admin Panel with PIN
- Trip banner system with start/end dates and housemate note
- Plant photos staged at `public/images/plant-N.jpg`
- Admin panel: add/edit/remove plants, set/clear trip

**Key decisions made:**
- Firestore for cross-device real-time sync (so Brock can see from abroad when plants are watered)
- PIN-protected admin (housemate sees app read-only; Brock or trusted users enter PIN to edit)
- Simple instructions field separate from care notes (housemate gets one plain-language sentence)

---

### Session 2 — Feature additions + GitHub Pages deployment (2026-06-27)

**Phase 1 — Plant management (carried from prior session):**
- Removed Plant 18 (duplicate of Plant 9, white/green nerve plant)
- Added Plant 28 (Neon Pothos, kitchen north window)
- Added Plant 29 (Philodendron 'Prince of Orange', hallway direct sun)
- Added plant photo thumbnails to Today tab task cards

**Phase 2 — Smarter watering status:**
- All Plants tab: replaced abstract "Good" status with "Water after Jul 9" style dates on plant cards
- Today tab: completed-today pills now show "Don't water before [date]" instead of just plant name
- `getNextWaterDate()` function added to `useWateringLog`

**Phase 3 — GitHub Pages deployment (large troubleshooting effort):**
- Initialized git repo at project root (`Plants/`), not inside `plant-guide/`
- Created GitHub repo `plant-guide` under account `nbrs5fydfg-dot`
- Added 7 GitHub repo secrets for Firebase config + admin PIN
- Enabled GitHub Pages with GitHub Actions source
- **Bug fixed:** `deploy.yml` was originally placed at `plant-guide/.github/workflows/deploy.yml` — GitHub only reads workflows from the repo root. Moved to `Plants/.github/workflows/deploy.yml`.
- **Bug fixed:** Initial repo was named `plants` but Vite base path was `/plant-guide/`. Assets 404'd. Fixed by renaming GitHub repo to `plant-guide` and updating git remote URL.
- **Bug fixed:** Secrets were initially pasted as one block; needed to be 7 separate name/value pairs.
- First successful live deploy: https://nbrs5fydfg-dot.github.io/plant-guide/

**Phase 4 — UI enhancements (same session):**
- Warning styling: changed from orange background to white background, T-Mobile Magenta (#E20074) bold text, teal (#0097A7) border — applies to both task card warning pills and All Plants warning alerts
- Today tab task cards: added "Last watered / Should water" date row below instruction text
- Admin edit-plant view: added "Override next water date" date picker (forces a specific next-water date, auto-clears on watering)
- Admin edit-plant view: added Watering History section — edit past dates, delete entries, add past watering entries
- Lifted `isAdmin` state to `App.jsx` so ✏️ Edit button in PlantDetail is persistent after PIN entry
- Admin direct-edit flow: clicking ✏️ on any plant opens AdminPanel directly in edit mode for that plant

**Files changed this session:**
- `src/hooks/useWateringLog.js` — added `logWateringOnDate`, `updateWateringEntry`, `deleteWateringEntry`, `getNextWaterDate`; updated `getWateringStatus` to respect `nextWaterDate` override
- `src/components/TodayTasks.jsx` — added water date rows, `fmtLastWatered`, `fmtNextWater`, `fmtNextWaterPill`
- `src/components/AdminPanel.jsx` — added watering history editor, override next water date field, direct-edit lazy init, new props
- `src/App.jsx` — lifted `isAdmin` state, added `handleLogWatering`, `handleEditPlant`, wired new props
- `src/index.css` — added `--magenta`, `--teal` variables; updated `.alert--warning`, `.warning-pill`; added `.task-card__water-dates`, `.log-edit-row`, `.input--date-sm`, `.log-add-row`, `.form-hint`, `.admin-section--log`
- `.github/workflows/deploy.yml` — moved to repo root, correct path for GitHub Actions
- `.gitignore` — added `.DS_Store` and `plant-guide/public/images/staging/`

---

### Session 3 — Cache fix + CLAUDE.md (2026-07-01)

- Confirmed that Phase 4 changes were live but not visible in regular browser due to GitHub Pages CDN cache
- Fix: incognito window showed new version correctly; regular window needed "Empty Cache and Hard Reload" in DevTools
- Created this CLAUDE.md file

---

### Session 4 — Email notifications + PlantDetail next water date (2026-07-02)

**Phase 1 — PlantDetail next water date:**
- Added "Next water: [date]" below "Last watered" in the PlantDetail modal, in bold magenta
- Added `nextWaterDate` prop to PlantDetail; wired in App.jsx via `getNextWaterDate(selectedPlant)`
- Added `.modal__next-water` CSS style

**Phase 2 — Email notification system (Firebase Cloud Functions):**
- Added `functions/` directory at repo root with `index.js` and `package.json`
- Installed Firebase CLI via Homebrew (`brew install firebase-cli`)
- Initialized Firebase project (`brocks-plant-guide`) with `.firebaserc` and `firebase.json`
- Upgraded Firebase Functions to Node 22 runtime in both `functions/package.json` and `firebase.json`
- Implemented two Cloud Functions:
  - `dailyWateringNotification`: scheduled `onSchedule` at `0 8 * * *` America/Los_Angeles, checks `enabled` flag in Firestore, skips if no plants due
  - `sendTestNotification`: `onCall` function triggered from Admin Panel, always sends (even if no plants due), includes test banner in email
- Added `useSettings.js` hook — reads/writes `settings/notifications` Firestore document (`{ enabled, recipientEmail, senderEmail }`)
- Updated `firebase.js` to export `fns` via `getFunctions`
- Added Notifications section to Admin Panel:
  - "ACTIVE" green badge when notifications are enabled
  - Checkbox toggle, recipient email, sender email fields
  - Save button with inline "✓ Saved" confirmation (3-second flash)
  - "Send Test Email" button with inline success/failure feedback
- Email HTML template: green header, plant table with name + instructions + last watered, link to app

**Phase 3 — Email provider switch (Gmail SMTP → SendGrid):**
- Original approach used nodemailer + Gmail App Password — persistently returned `535-5.7.8 Username and Password not accepted` despite correct 2-Step Verification setup; suspected Google blocking SMTP from Cloud Functions IP range
- Switched to SendGrid:
  - Brock signed up at sendgrid.com (free, 100 emails/day)
  - Single Sender Verification for `brock.gonzales@gmail.com` (no domain required)
  - API key stored as Firebase secret `SENDGRID_API_KEY`
  - Replaced `nodemailer` with `@sendgrid/mail` in `functions/package.json` and `functions/index.js`
- First successful test email sent to `colleenk.mills@yahoo.com`

**Files changed this session:**
- `functions/index.js` — new: Cloud Functions with SendGrid email, shared helpers (isDue, buildEmail, loadData, sendEmail)
- `functions/package.json` — new: `@sendgrid/mail` dependency, Node 22 engine
- `firebase.json` — new: functions source + Node 22 runtime
- `.firebaserc` — new: default project `brocks-plant-guide`
- `plant-guide/src/firebase.js` — added `getFunctions` export (`fns`)
- `plant-guide/src/hooks/useSettings.js` — new: reads/writes `settings/notifications` Firestore doc
- `plant-guide/src/App.jsx` — added `useSettings`, wired `notifSettings`/`saveNotifSettings` to AdminPanel, added `nextWaterDate` to PlantDetail
- `plant-guide/src/components/PlantDetail.jsx` — added next water date display in bold magenta
- `plant-guide/src/components/AdminPanel.jsx` — added Notifications section with toggle, email fields, save confirmation, test email button
- `plant-guide/src/index.css` — added `.modal__next-water`, `.badge--active`, `.admin-section__title-row`, `.notif-save-row`, `.notif-saved-msg`

**Firebase secrets (Secret Manager):**
- `SENDGRID_API_KEY` — SendGrid API key for email sending
- `GMAIL_APP_PASSWORD` — deprecated, no longer used (kept in Secret Manager but not referenced)
