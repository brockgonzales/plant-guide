# Brock's Plant Guide — Project Reference

## Project Overview

A photo-first plant care app so Brock's housemate Cole — or any house/plant sitter — can care for ~30 houseplants while Brock travels, with zero plant knowledge. Brock checks in from abroad on the same app. It runs as an **installable iPhone app (PWA)**: added to the home screen from Safari, opens full-screen, and sends **push notifications** for plants due that day — every day for Brock's phone, and only during a set trip for everyone else. Plants are organized by the window they sit in (Desk / Kitchen / Living Room / Stairwell).

**Live URL:** https://brockgonzales.github.io/plant-guide/
**GitHub repo:** https://github.com/brockgonzales/plant-guide (formerly under account `nbrs5fydfg-dot` — ignore any old references to it)
**Firebase project:** `brocks-plant-guide`
**Local root:** `/Users/brockgonzales/Documents/Claude/Projects/Plants/`

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite 5 | Fast dev, small bundle |
| App shell | PWA — `manifest.json`, home-screen icons, `sw.js` | Installs like an app on iPhone; no App Store, no $99/yr, sitters just "Add to Home Screen" |
| Database | Firebase Firestore | Real-time sync across devices, no server |
| Push | Firebase Cloud Messaging (web push) | Home-screen app notifications on iOS 16.4+; default FCM VAPID key, no secrets to manage |
| Email | SendGrid (`@sendgrid/mail`) | Trip reminder email; single sender verified at brock.gonzales@gmail.com |
| Text | ~~Twilio~~ | **Abandoned 2026-10-01** — A2P campaign rejected 3×; push replaced it. Admin UI is email-only; SMS code still in `functions/index.js` but unreachable |
| Functions | Firebase Cloud Functions v2 (Node 22) | Daily 8am PT reminder job + on-demand test email/text and test push |
| Hosting | GitHub Pages via GitHub Actions | Free, auto-deploys the frontend on every push to `main` |
| Styling | Vanilla CSS (no UI library) | Full control, no dependency overhead |

---

## Directory Structure

```
Plants/                              ← git repo root
├── CLAUDE.md                        ← this file
├── plant_care_guide.md              ← plant-by-plant care reference (non-app doc)
├── firebase.json / .firebaserc      ← Firebase config (functions source, Node 22) / project alias
├── .github/workflows/deploy.yml     ← CI/CD — MUST be at repo root, not in plant-guide/
├── .gitignore                       ← includes `Plant Pictures/` (raw iPhone photos, GPS-tagged)
├── Plant Pictures/<Window>/         ← raw photos by location (local only, never committed)
├── functions/
│   ├── index.js                     ← dailyWateringNotification, sendTestNotification, sendTestPush
│   └── package.json                 ← firebase-admin, firebase-functions, @sendgrid/mail, twilio
└── plant-guide/                     ← Vite app
    ├── index.html                   ← iOS app meta tags, manifest + apple-touch-icon links
    ├── public/
    │   ├── manifest.json            ← PWA manifest (scope/start_url /plant-guide/, standalone)
    │   ├── sw.js                    ← service worker: show pushes + open app on tap (no caching)
    │   ├── apple-touch-icon.png, icon-192.png, icon-512.png
    │   ├── images/plant-N-v2.jpg    ← current photos (EXIF/GPS stripped); plant-N.jpg = older, unused
    │   ├── privacy-policy.html      ← required for Twilio A2P registration
    │   └── terms.html               ← required for Twilio A2P registration
    ├── src/
    │   ├── App.jsx                  ← root: tabs, admin auth lift, reminders hook, Mark Watered (records phone name)
    │   ├── firebase.js              ← Firebase init; exports app, db, fns
    │   ├── index.css                ← all styles, CSS custom properties
    │   ├── components/
    │   │   ├── Header.jsx           ← tabs (Today / All Plants) + ⚙️ admin
    │   │   ├── RemindersCard.jsx    ← Today-tab card: install steps, turn on reminders, test/off, every-day toggle
    │   │   ├── TodayTasks.jsx       ← due plants grouped by window + "Completed today"
    │   │   ├── PlantGrid.jsx        ← All Plants grouped by window
    │   │   ├── PlantCard.jsx        ← card in the grid
    │   │   ├── PlantDetail.jsx      ← modal: care info, watering log, ✏️ edit
    │   │   ├── AdminPanel.jsx       ← PIN: trip, plant list w/ checkboxes + bulk pop-ups, add/edit, notifications
    │   │   └── TripBanner.jsx       ← "Day X of Y — Destination"
    │   ├── hooks/
    │   │   ├── usePlants.js         ← `plants` CRUD + sync; runs one-time data updates
    │   │   ├── useWateringLog.js    ← `wateringLog`: log, status, history edits
    │   │   ├── useTrip.js           ← `config/currentTrip` doc
    │   │   ├── useSettings.js       ← `settings/notifications` doc
    │   │   └── useReminders.js      ← push opt-in: SW registration, FCM token, `devices/{id}` doc
    │   └── data/
    │       ├── locations.js         ← LOCATION_ORDER + groupByLocation() (shared by all grouped views)
    │       ├── relocation2026.js    ← one-time Sept 2026 relocation update (flag-guarded)
    │       └── initialPlants.js     ← original seed data + WATERING_METHODS (seed only, not authoritative)
    ├── vite.config.js               ← base: '/plant-guide/' — must match GitHub repo name
    └── .env.local                   ← local dev secrets (not committed)
```

---

## Firestore Data Model

| Path | Contents |
|---|---|
| `plants/plant-N` | `{ number, name, species, location, wateringIntervalDays, wateringIntervalMaxDays, wateringMethod, simpleInstruction, lightNeeds, careNotes, warnings[], isActive, hasPhoto, photoPath, nextWaterDate? }` |
| `wateringLog/{auto}` | `{ plantId, wateredAt: Timestamp, wateredBy, note }` — `wateredBy` is the phone's reminder name (e.g. "Cole"), `'manual'` for admin-added past waterings |
| `config/currentTrip` | `{ destination, startDate, endDate, hosteeNote }` — gates sitter reminders + email |
| `config/migrations` | flags for one-time data updates, e.g. `relocation2026_09: true` |
| `settings/notifications` | `{ enabled, channel: 'email'\|'text'\|'both', recipientEmail, senderEmail, recipientPhone }` |
| `devices/{random id}` | one per phone with reminders on: `{ token, name, alwaysRemind, updatedAt }` |

---

## Deployment

### Frontend (automatic)
Every `git push` to `main` triggers GitHub Actions: install deps in `plant-guide/` → `npm run build` with the 7 secrets injected → deploy `plant-guide/dist/` to GitHub Pages. Takes ~2 minutes. Check at https://github.com/brockgonzales/plant-guide/actions.

- Vite `base` **must** be `/plant-guide/` (the repo name) — the manifest, icons, and service worker scope all assume it too.
- `deploy.yml` **must** live at the repo-root `.github/workflows/`.
- GitHub repo secrets (Settings → Secrets → Actions): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_ADMIN_PIN`.
- **Verify a deploy is live** by polling the live bundle for a string unique to the change (e.g. `curl` the `assets/index-*.js` named in `index.html` and `grep`), not by trusting the Actions tick alone.

### Cloud Functions (manual)
```bash
cd /Users/brockgonzales/Documents/Claude/Projects/Plants
firebase deploy --only functions            # or --only functions:sendTestPush,...
firebase functions:log --only sendTestPush  # read logs
```
Functions are **not** deployed by GitHub Actions. Secrets in Firebase Secret Manager: `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (plus unused `GMAIL_APP_PASSWORD`). Push needs no secret.

### Caching
GitHub Pages caches JS/CSS. If the site looks stale after a deploy: incognito window, hard reload, or on iPhone fully close the home-screen app (swipe it away in the app switcher) and reopen.

### Photos
New plant photos: resize to 1200px on the long side, apply EXIF orientation, and **re-encode with no metadata** (iPhone photos carry GPS pointing at Brock's home and the site is public). No exiftool/ImageMagick on this Mac — use Pillow in a scratch venv. Save as `public/images/plant-N-v2.jpg` (new filename busts caches) and set `photoPath` on the plant. Older GPS-tagged photos still exist in public git history — only fixable with a history rewrite; Brock's call.

---

## Key Architecture Decisions

**Grouping by window** — `src/data/locations.js` defines `LOCATION_ORDER` (Desk / Kitchen / Living Room / Stairwell Window) and `groupByLocation()`. All Plants, the Today due list, and the Admin plant list render one section per window with a `.location-section__title` header (20px bold `--green-700`); anything with another location string lands in a trailing "Other" section (Admin adds "Removed" for inactive plants). Location is therefore an exact-match string — the bulk "Update location" pop-up uses a dropdown so it can't be typo'd. The header selector is `.location-sections .location-section__title` on purpose so `.admin-section h3` can't override it.

**One-time data updates run in the client** — Claude can't write to Firestore from the dev machine (no credentials; the auto-mode classifier blocks credential access). Bulk data changes ship as code: a module like `relocation2026.js` called from `usePlants`' snapshot handler, doing one `writeBatch` and setting a `config/migrations` flag so it runs exactly once and never overwrites later Admin edits. It applies the first time anyone opens the app after deploy. Precedent: plants 28/29 seeding and plant-18 deactivation in `usePlants.js`.

**Reminder routing** — each opted-in phone is a `devices` doc. The daily job (8am PT) computes due plants; if none, nothing is sent. Push goes to `alwaysRemind` devices every due day, and to **all** devices when a trip is active **and** `settings/notifications.enabled` is on. Email/text go out only in that trip case. The `alwaysRemind` checkbox is only shown when admin-unlocked (PIN), so sitter phones are trip-only by default. Dead FCM tokens are deleted automatically.

**Service worker does no caching** — `sw.js` only displays pushes and focuses/opens the app on tap. A caching SW on top of GitHub Pages' caching would hide deploys. On iOS every push must show a notification or permission is revoked, so the SW always calls `showNotification`. Messages include a `webpush.notification` block — data-only FCM messages were accepted by FCM but never shown on iPhone.

**Bulk editing lives on the Admin plant list** — checkboxes + 72px photos on every active row (Brock identifies plants by photo, not name), "Select all plants", and a sticky bar with **Update location / Add past watering / Watering schedule**, each a pop-up listing affected plants that only closes via Cancel/Apply. The admin backdrop won't close the panel while plants are selected, and sub-views only close via ✕ or ← Back (prevents the Session 7 data-loss bug).

**Admin auth state lifted to App.jsx** — `isAdmin` lives in App so the ✏️ Edit button in PlantDetail and the every-day reminder toggle work once the PIN is entered. It is in-memory only, so it resets when the app is relaunched. The PIN (`VITE_ADMIN_PIN`) is compiled into the public bundle — fine for a household tool, not real security.

**`plant.nextWaterDate` override field** — optional date on a plant; when set, status/next-date use it instead of the log. Auto-cleared when watered via Mark Watered.

**Watering log is Firestore, not plant state** — one `wateringLog` doc per watering, subscribed with `onSnapshot`, so edits propagate live to every device.

**No router** — tabs via `useState`; deep links aren't needed.

---

## Onboarding a Phone (Brock, Cole, or a sitter)

1. Open the live URL in **Safari** (sharing the home-screen bookmark by text works — the recipient still has to do step 2).
2. Share → **Add to Home Screen** → Add. Always open **Plants** from the icon afterwards.
3. Today tab → reminders card → enter a name → **Turn on reminders** → Allow. Sitters are trip-only automatically. Brock: enter the PIN (⚙️) first, or afterwards tick **Remind me every day** on the card.
4. **Send test**. If it lands in Notification Center with no banner: iPhone **Settings → Notifications → Plants → Banners** on; remove Plants from **Scheduled Summary**; check Focus. That's a phone setting, not the app.

---

## Plant Inventory

As of the Sept 2026 repot (Session 9): 30 active plants, numbered 1–33, grouped into four window locations. Retired: #5 Prayer Plant (deceased), #18 (duplicate of #9), #25 African Violet (deceased Sept 2026). Location strings must match exactly — `groupByLocation()` groups on them and anything else lands in "Other".

- **Desk Window:** #16 Heartleaf Philodendron (1 of 2), #23 Autograph Tree, #32 Pink Nerve Plant
- **Kitchen Window:** #3 Red Nerve Plant, #12 Chinese Evergreen green/cream, #28 Neon Pothos, #33 Baby Rubber Plant (Peperomia obtusifolia)
- **Living Room Window:** #7 Zebra Plant, #10 Black Rubber Plant (1 of 2), #13 Chinese Evergreen white/silver, #30 Black Rubber Plant (2 of 2)
- **Stairwell Window:** #1 & #2 Raven ZZ, #4 Cast Iron Plant, #6 Ripple Peperomia, #8 Dragon Tree, #9 White/green Nerve Plant, #11 Stromanthe 'Triostar', #14 Silver-blue Philodendron, #15 Snake Plant, #17 Anthurium, #19 Corn Plant, #20 Rubber Plant 'Tineke', #21 Jade Plant, #22 Purple Passion, #24 Wandering Dude, #26 Red Chinese Evergreen 'Siam Aurora', #27 White/Cream Chinese Evergreen, #29 Philodendron 'Prince of Orange', #31 Heartleaf Philodendron (2 of 2)

#30 and #31 are the halves of #10 and #16, split during repotting. Current photos are `public/images/plant-N-v2.jpg`; the older `plant-N.jpg` files are no longer referenced by active plants.

---

## Local Development

```bash
cd plant-guide
npm install       # first time only
npm run dev       # starts at localhost:5173
```

Requires a `.env.local` file in `plant-guide/` with the 7 Firebase + PIN variables (same keys as GitHub secrets).

- **The dev server talks to the production Firestore.** Opening it in a browser writes real data and runs any pending one-time data update.
- **No browser tool yet** (Playwright MCP not installed — add via `/mcp` → Add server, stdio `npx -y @playwright/mcp@latest`; the `claude` CLI isn't on PATH inside the VSCode extension). Until then, verify UI with `npm run build` plus a server-render smoke test: `vite.createServer({ server: { middlewareMode: true }, appType: 'custom' })`, load the component with `ssrLoadModule`, import `react`/`react-dom/server` natively (not via `ssrLoadModule`), and `renderToString` with mock props. Run it with `node --input-type=module -e` from `plant-guide/` so `vite` resolves.
- Push notifications only work in the **installed** iPhone app (iOS 16.4+) or desktop browsers that support web push — not in iPhone Safari tabs.
- Regenerating the app icon: render a full-bleed square SVG with `qlmanage -t -s 1024` (it draws emoji), then resize to 180/192/512 with Pillow.

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

---

### Session 5 — Gate notifications on trip dates (2026-09-08)

**Bug reported:** after Brock returned from India, Cole kept receiving daily watering emails even though Brock was home and watering the plants himself. Root cause: the `enabled` toggle in Admin Panel → Notifications was a manual on/off switch with no relationship to the trip banner/dates — nothing auto-stopped it when a trip ended.

**Fix — scheduled email now requires an active trip:**
- `functions/index.js` — added `isTripActive(db)`, which reads `config/currentTrip` and checks whether today falls within `[startDate, endDate]` (inclusive, same day-zeroing pattern as `isDue`). `dailyWateringNotification` now returns early (no email) if there's no trip or today is outside its window, before even checking the `enabled` flag. `sendTestNotification` is unchanged — the admin test-email button still fires regardless of trip status, since it's a manual preview action.
- The `enabled` checkbox remains as a master switch (e.g. to suppress emails during a trip if Cole isn't covering that one), but going forward the trip's start/end dates set via Admin Panel → Set Trip are what actually start and stop the daily emails — nothing to remember to toggle off after returning.
- `plant-guide/src/components/AdminPanel.jsx` — Notifications section now shows trip-aware status copy (active trip / upcoming trip with days-until / trip ended / no trip set); "Active" badge now requires both `enabled` AND an active trip.
- `plant-guide/src/App.jsx` — passes `tripStatus` (from `useTrip().getTripStatus()`) into `AdminPanel`.

**For the October trip:** set the trip's start/end dates via Admin Panel → Set Trip as usual; as long as "Send daily watering reminders during trips" stays checked, Cole's emails will start on day 1 and stop automatically the day after the trip ends — no manual toggle needed.

**Files changed this session:**
- `functions/index.js` — added `isTripActive`, wired into `dailyWateringNotification`
- `plant-guide/src/App.jsx` — passes `tripStatus` to `AdminPanel`
- `plant-guide/src/components/AdminPanel.jsx` — trip-aware Notifications copy and Active badge logic

---

### Session 6 — Text message notifications via Twilio (2026-09-08)

**Requests:**
1. Support text message notifications, not just email.
2. Only notify (email or text) on days when at least one plant is actually due — no notification at all otherwise.
3. A notification should list only the specific plant(s) due that day, not all plants.

**#2 and #3 were already correct** — `dailyWateringNotification` already computed `duePlants` for that day and returned early with no send when `duePlants.length === 0`, and `buildEmail` only ever rendered that due-plants list. No changes needed for those two.

**#1 — added Twilio SMS as a channel:**
- `functions/index.js`:
  - Added `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` secrets and the `twilio` npm package.
  - Added `buildText(duePlants, { isTest })` — plain-text version of the reminder (plant number, name, simple instruction per line).
  - Added `sendText()` (Twilio REST call) and `sendViaChannel()`, which sends email, text, or both based on `settings/notifications.channel`.
  - `loadData()` now also reads `channel` (`'email' | 'text' | 'both'`, defaults to `'email'`) and `recipientPhone`, and validates only the fields the selected channel actually needs.
  - Both `dailyWateringNotification` and `sendTestNotification` now call `sendViaChannel()` instead of calling SendGrid directly.
- `plant-guide/src/hooks/useSettings.js` — `DEFAULT_SETTINGS` now includes `channel: 'email'` and `recipientPhone: ''`; existing settings docs are merged with defaults on load so older docs without these fields don't break.
- `plant-guide/src/components/AdminPanel.jsx` — Notifications section now has a "Notify by" select (Email only / Text only / Email and text); email fields only show for email/both, a phone field (with country code, e.g. `+12065551234`) only shows for text/both. "Send Test Email" renamed to "Send Test Notification" since it now respects the channel setting.

**Deploy status:** frontend and function code committed; **`firebase deploy --only functions` was not run yet** — it will fail until `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` exist in Firebase Secret Manager, since Cloud Functions v2 requires declared secrets to exist at deploy time even if unused at runtime. Brock needs to sign up at twilio.com, get the Account SID + Auth Token from the console, and buy/verify a phone number, then either run `firebase functions:secrets:set <NAME>` for each or hand the three values over to set them. Cole's actual phone number is not a secret — it's entered in Admin Panel → Notifications → Notify phone, stored in the `settings/notifications` Firestore doc.

**Files changed this session:**
- `functions/index.js` — Twilio secrets, `buildText`, `sendText`, `sendViaChannel`, channel-aware `loadData`
- `functions/package.json` / `functions/package-lock.json` — added `twilio` dependency
- `plant-guide/src/hooks/useSettings.js` — `channel`/`recipientPhone` defaults, merge-on-load
- `plant-guide/src/components/AdminPanel.jsx` — channel selector, phone field, generalized copy

---

### Session 7 — Twilio A2P registration, bulk edit feature (built then reworked), India trip prep, plant photo ID (2026-09-22)

**Context coming in:** Session 6 had written the Twilio SMS code but explicitly left `firebase deploy --only functions` un-run because the three Twilio secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) didn't exist yet in Firebase Secret Manager. Brock also flagged that the plants had all just been repotted and moved for an upcoming India trip (**10/1/26 – 10/15/26**, confirmed exact dates this session), with many needing seasonal (fall/winter) watering-frequency changes.

**Phase 1 — Confirmed Twilio as the SMS provider:**
- Brock had a vague memory of deciding on a "different solution" than Twilio; no evidence of that existed anywhere in git history or prior session logs. Brock then explicitly confirmed: *"ok. let's go with twilio. i have signed up and created a billing account for pay as you go."* Twilio remains the SMS provider — no code changes needed here since Session 6 already built the integration; this session focused on finishing account/compliance setup and deploying it.

**Phase 2 — Twilio A2P 10DLC compliance walkthrough (interactive, via user screenshots):**
Twilio requires A2P 10DLC registration before a long-code number can send SMS in the US. Walked through the full pipeline live:
1. Twilio account + billing set up by Brock, phone number purchased.
2. **Brand registration** — registered as **Sole Proprietor** (cheapest/fastest tier, sufficient for this low-volume private use case). Brand submitted → went to "In Review" → came back **Approved**.
3. **Campaign registration** — use-case type was constrained to "Sole Proprietor" given the Brand type (no other options were offered). Went through multiple rejected quick-check attempts before passing:
   - *Rejection 1:* Campaign Description was written as "personal texting between two people," which 10DLC review rejects — carriers require the message to be framed as coming from software/a platform, not a person. Rewrote it to describe the Cloud Function / app as the automated sender.
   - *Rejection 2:* Sample messages were missing the brand name and opt-out language. Fixed by prefixing samples with "Plant Guide Notifications:" and appending "Reply STOP to opt out."
   - *Rejection 3 (twice):* "Proof of consent" field. First attempt was a narrative explanation, which was rejected for not being a literal, quotable consent script. Second attempt was a quoted script but was still missing required disclosure elements. Final version is a quoted verbal script that includes: the brand name, message frequency, "Msg & data rates may apply," and STOP/HELP instructions.
   - Along the way, the Twilio console also threw a one-off "unexpected error" on Campaign submission — this was a transient sync delay right after Brand approval; retrying ~1 minute later worked.
4. **Required hosted Privacy Policy + Terms & Conditions URLs** — this requirement wasn't anticipated at the start (initially assumed the bare app root URL might be enough for this small a use case); once the actual Twilio form demanded specific content, built and deployed two dedicated static pages instead of a placeholder:
   - `plant-guide/public/privacy-policy.html` (NEW) — title "Privacy Policy," names the brand "Plant Guide Notifications," states what's collected (plant data, recipient email/phone entered manually by Brock, not via public signup), how it's used (reminders only), and contains the Twilio-required exact phrase: *"We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes."* Includes STOP opt-out instructions and contact email `brock.gonzales@gmail.com`.
   - `plant-guide/public/terms.html` (NEW) — title "Terms & Conditions," includes a dedicated "SMS Terms" section stating message frequency ("at most once per day"), the required "Message and data rates may apply" disclosure, STOP/HELP instructions, a no-warranty clause, and the same contact email.
   - Both pages are plain static HTML dropped in `plant-guide/public/` — Vite copies `public/` as-is into `dist/`, so they deploy automatically via the existing GitHub Actions pipeline with no build config changes.
   - Confirmed live after deploy (polled with `curl -o /dev/null -w "%{http_code}"` in a retry loop since the GitHub Pages CDN took ~4 polling attempts / ~60–80s to catch up): `https://brockgonzales.github.io/plant-guide/privacy-policy.html` and `.../terms.html` both returned HTTP 200.
   - Campaign was resubmitted with these URLs and **passed the quick check**. **Status as of last check: "In Review" (pending carrier approval) — NOT yet confirmed approved.**

**Phase 3 — Firebase secrets + function deployment:**
- Gave Brock the step-by-step for `firebase functions:secrets:set <NAME>` for each of the three Twilio secrets. **Brock ran these commands himself in his own terminal** — at no point were the actual secret values (Account SID, Auth Token, phone number) typed into or stored in this chat session. This is a deliberate, maintained security boundary.
- Brock lost his copy of the Auth Token after setting it and asked for it back — declined, since it was never available to this session to give back; redirected him to re-reveal it in the Twilio console instead. **This boundary should be maintained in all future sessions: never type, store, or relay raw secret values (API keys, tokens, passwords) through the chat, even if the user asks for a lost value back.**
- Brock also initially entered `TWILIO_PHONE_NUMBER` in the wrong format, then corrected it — this created two secret versions in Secret Manager (v1 wrong, v2 correct), which needed no cleanup since Cloud Functions v2 always resolves to the latest version at deploy time.
- Ran `firebase deploy --only functions` from the repo root — **succeeded**. Both `dailyWateringNotification(us-central1)` and `sendTestNotification(us-central1)` (Node.js 22, 2nd Gen) were updated and granted secret access to `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- **Net effect: the Twilio SMS code path is now live in production**, but actual SMS delivery is still gated on the A2P Campaign being approved (carrier-level review, not something either of us controls the timing of) and on Cole's phone number + a channel of `text` or `both` being set in Admin Panel → Notifications (not yet confirmed set).

**Phase 4 — Bulk edit feature, v1 (built, then found to have real problems):**
- Brock's ask: after repotting/relocating ~28 plants, editing each individually via the existing one-plant-at-a-time "Edit Plant" form would be far too slow before the trip. Asked whether one-by-one editing was sufficient; Brock said *"Yes, build bulk editing."*
- Built v1: a new Admin Panel view listing every active plant as its own inline card (36px photo thumbnail, name, and four editable fields: Location, Water-every min/max days, Watering Method), with one "Save All Changes" button at the bottom that diffed every row against its original value and wrote only the changed ones.
- Committed as `0404024` — "Add bulk edit for plant location and watering frequency" (`AdminPanel.jsx`, `index.css`).
- **This version is now superseded (see Phase 6) — do not resurrect the old per-row inline-edit UI or the 36px thumbnail size.**

**Phase 5 — Trip dates, HEIC handling, and plant photo identification (unresolved — needs Brock's confirmation):**
- Brock gave exact India trip dates: **10/1/26 – 10/15/26**. Instructed him to enter these himself via Admin Panel → "Set Upcoming Trip" (Destination "India", those two dates, optional note for Cole) since this session has no browser access to do it directly. **Not yet confirmed done** — check Admin Panel → Trip section (or the `trips`/`config/currentTrip` Firestore doc) at the start of the next session.
- Brock asked whether HEIC photos dragged from the Mac Photos app would work when pasted into chat. Confirmed yes — pasting/dragging into this chat auto-converts to JPG/PNG regardless of source format (all screenshots throughout this whole conversation, including the 8 plant photos below, landed as `.jpg`), so no manual conversion is needed for this workflow. (`sips` was offered as a manual fallback if raw `.heic` files ever need converting from disk directly, but wasn't needed.)
- Brock then shared **8 photos of every plant in its new post-repotting location**, captioned: *"there are two new plants in there as well. can you figure out which ones."* I gave a photo-by-photo tentative read cross-referenced against the 28-plant roster in this file's "Plant Inventory" section, explicitly flagging low confidence given photo resolution and how visually similar several species are (e.g. the Ficus elastica 'Burgundy' vs. 'Tineke' rubber plants were indistinguishable in two different photos). Best guesses given:
  - Confident matches: #19 Corn Plant, #15 Snake Plant, #11 Stromanthe Triostar, #17 Anthurium, #7 Zebra Plant, #21 Jade Plant, #24 Wandering Dude, #6 Ripple Peperomia, #29 Prince of Orange (via its characteristic orange new growth), #10 Black Rubber Plant (now on a plant stand), #1/#2 Raven ZZ.
  - Uncertain: several Chinese Evergreen variants (#12/#13/#26/#27 look similar in photos), which rubber plant is #10 vs #20 Tineke in two different shots, and a small pink/green mottled plant that might be #3 Red Nerve Plant or might be new.
  - **Two candidates flagged for "new plant not in inventory":** (1) a dark purple-leaved ornamental plant visible in one windowsill photo (no match in the current 28-plant roster), and (2) a spiky, grass-like plant in a white pot visible in one of the console photos (also no match).
  - **This entire identification is unconfirmed.** Brock has not yet responded with corrections, the actual names/species of the two new plants, or confirmed new locations. **This must be resolved before running the bulk-location update** — do not write guessed locations into Firestore without Brock's sign-off.

**Phase 6 — Bulk edit rework, v2 (the main deliverable of this session):**
- Brock's feedback on v1, verbatim: *"the bulk edit function is good but its too small. i can't tell the plants by picture and i do not know them well enough by name. plus as i was editing them the page reset on its own before i could finish or save... lost half of the updates i was making. it would be good to let me bulk select the plants i want to update and let me update the fields once and have it propagate to all of the ones i checked."*
- **Root-cause investigation for the "page reset on its own" data-loss bug:** Re-read `AdminPanel.jsx` and `App.jsx` in full. `bulkForm` (the v1 state) was a plain `useState` with nothing else writing to it — no effect keyed on the live Firestore `plants` snapshot, no remount-inducing `key` prop on `<AdminPanel>` in `App.jsx`. The one concrete mechanism found that would silently drop all in-progress admin state: the modal-overlay `onClick` handler — `onClick={e => e.target === e.currentTarget && onClose()}` — closed and **unmounted the entire `AdminPanel` component** (discarding every piece of local state, not just bulk-edit) whenever a click/tap landed on the semi-transparent backdrop outside the modal box itself. With a long scrolling list of ~28 plant rows (v1's UI), a stray tap or touch-scroll landing just outside the modal edge is very plausible, especially on a phone. This reads as the most likely explanation for the reported reset, though it was not reproduced live (no browser tool was available this session — see Phase 7).
- **Redesigned bulk edit as an explicit two-step flow**, matching Brock's requested UX exactly (select the plants, set the fields once, propagate to all selected):
  - **Step 1 — "select"**: every active plant shown as a checkbox row with a **72px photo** (up from 36px — matches the size already used on the Today tab's task cards, chosen specifically because it was the smallest size Brock had already found "readable" elsewhere in the app), `#number Name`, and the plant's **current location** as a subtitle for context. "Select All" / "Clear" buttons at the top, a running "N selected" count, and a sticky bottom bar with a "Continue →" button (disabled until at least one plant is checked).
  - **Step 2 — "apply"**: one shared form with exactly four fields — Location (text), Water-every min days, Water-every max days, Watering Method (select) — plus a summary line listing exactly which plants (by `#number Name`) are about to be changed. **Any field left blank (or the method dropdown left on "— No change —") is not written** — this lets Brock, e.g., bulk-set only Location for one group of plants and only Watering Method for a different group, without one selection's blank fields ever overwriting real data with empty strings. Clicking "Apply to N plants" fires one `Promise.all` of `updatePlant(id, updates)` calls for every checked plant ID, then resets back to a fresh "select" step (so Brock can immediately start a second batch with different plants/values without re-opening the feature) and flashes a "N plants updated!" confirmation.
  - This also structurally reduces the data-loss blast radius versus v1: the only state that can be lost to an interruption is one batch's field values (a few seconds of typing), never 28 rows of in-progress per-plant edits.
- **Fixed the accidental-close bug for every admin sub-view, not just bulk-edit:** changed the overlay's `onClick` guard to `e.target === e.currentTarget && view === 'home' && onClose()`. Now a stray backdrop tap only closes the panel when sitting at the Admin home screen; while inside Add Plant, Edit Plant, Bulk Edit, or Set Trip, only the explicit ✕ button or a view's own "← Back" button will exit. **This is a general safety fix — apply the same pattern to any future admin sub-view added to this component.**
- CSS: removed the old v1 rules (`.bulk-edit-list`, `.bulk-edit-row`, `.bulk-edit-row__*` at 36px) and added the v2 rules in `index.css`: `.bulk-toolbar`/`.bulk-toolbar__count`, `.bulk-select-list`, `.bulk-select-row` (+ `--checked` state), `.bulk-select-row__checkbox`/`__thumb`/`__thumb--placeholder`/`__info`/`__name`/`__location`, `.bulk-sticky-bar`, `.bulk-apply-summary`/`.bulk-apply-hint`.
- Verified `npm run build` succeeds (no syntax/type errors) and that `npm run dev` serves the app (HTTP 200 on the local root). **Did not** interactively click through the new select → apply → confirm flow in an actual browser — no browser automation tool was available in this session (see Phase 7). Treat the UI as code-reviewed and build-verified but **not yet functionally verified**.
- Committed as `022546e` — "Rework bulk edit into select-then-apply flow" (`AdminPanel.jsx`, `index.css`) — pushed to `origin/main`.

**Phase 7 — Browser automation tooling (discussed, not yet installed):**
- Brock asked what's needed to add a browser tool so future sessions can actually click through UI changes instead of only build-checking them. Delegated the lookup to the `claude-code-guide` subagent rather than answering from memory, since exact package names/command syntax matter and are easy to get subtly wrong.
- Recommended path: **Playwright MCP** (Microsoft's official package). Install with:
  ```
  claude mcp add playwright -- npx -y @playwright/mcp@latest
  ```
  Default scope is local (this project only, this user only) — add `--scope project` to share via a committed `.mcp.json`, or `--scope user` for all projects. Verify with `claude mcp list` or the `/mcp` slash command (works identically in the VSCode extension). No session restart required; the first tool call triggers a one-time permission prompt. Requires Node 18+ (already satisfied) and a browser installed locally.
- **Not yet installed** — Brock has not run the `claude mcp add` command as of end of session. **Once installed, the first thing to do with it should be a real interactive test of the Phase 6 bulk-edit-v2 flow** (select several plants, apply a location/watering change, confirm it lands correctly in Firestore, confirm the sticky bar and checkbox states behave, confirm the accidental-backdrop-click fix actually holds) before trusting it for the real pre-trip data entry.

**Files changed this session (chronological):**
- `plant-guide/src/components/AdminPanel.jsx` — v1 bulk edit added, then fully reworked to v2 (see Phase 4 & 6)
- `plant-guide/src/index.css` — v1 bulk-edit styles added, then replaced with v2 styles
- `plant-guide/public/privacy-policy.html` — new, for Twilio A2P
- `plant-guide/public/terms.html` — new, for Twilio A2P
- Firebase Secret Manager — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` set (by Brock, values never seen by this session)
- Firebase Cloud Functions — `dailyWateringNotification` and `sendTestNotification` redeployed with Twilio secret access

**Git commits this session:**
- `0404024` — Add bulk edit for plant location and watering frequency (v1, superseded)
- `f8801d5` — Add privacy policy and terms pages for Twilio A2P registration
- `022546e` — Rework bulk edit into select-then-apply flow (v2, current) — pushed to `origin/main`

**Everything pending — pick up here next session, roughly in priority order:**
1. **Check Twilio A2P Campaign status** (was "In Review" as of this session's last check). If approved, SMS is fully live end-to-end. If rejected, expect another round of quick-check-style fixes similar to Phase 2.
2. **Confirm the India trip (10/1/26–10/15/26) has been entered** via Admin Panel → Set Trip (or check the `config/currentTrip` / `trips` Firestore doc directly) — given to Brock as a manual step, completion not verified.
3. **Resolve the plant photo identification from Phase 5** — get Brock's corrections/confirmations on the tentative per-photo plant matches, get the actual name/species for the two candidate "new" plants (purple-leaved ornamental; spiky/grass-like plant in a white pot), and confirm each plant's new location.
4. **Once #3 is resolved:** use the new bulk-edit v2 flow (Phase 6) to update locations for all relocated plants, and add the two brand-new plants via the existing "+ Add New Plant" flow (bulk edit intentionally only edits existing active plants — it has no add-new capability). Also still need actual per-plant fall/winter watering-frequency numbers from Brock — he flagged that many plants need less-frequent watering heading into hibernation season but hasn't given specific min/max day values yet.
5. **Install Playwright MCP** (Phase 7 command above) and use it to functionally test the bulk-edit v2 flow in a real browser before relying on it for the pre-trip data entry — this has only been build-verified, not click-tested.
6. If Brock wants the app's plant photos themselves refreshed to match the new pots/locations, the actual image files still need to be added to `plant-guide/public/images/` and committed — not started.
7. No action needed, just a standing note: `GMAIL_APP_PASSWORD` remains an unused/deprecated secret sitting in Firebase Secret Manager (see Session 4) — harmless, just noise.

---

### Session 8 — Twilio A2P rejection round 2, email-only trip fallback confirmed (2026-09-26)

**Context coming in:** India trip starts 2026-10-01 (5 days out at session start). Session 7 had left the A2P Campaign "In Review, not yet confirmed approved." This session found it had actually come back **rejected** in the interim.

**Trip dates — confirmed set.** Brock confirmed the India trip (10/1–10/15) is already entered via Admin Panel → Set Trip. Item #2 from Session 7's pending list is done.

**Twilio A2P Campaign — rejected, then resubmitted, now back in review:**
- Rejection reason: Twilio error code [30886](https://twilio.com/docs/api/errors/30886) — "Campaign Description field does not clearly explain the messaging program" / "includes personal information instead of a general summary." The original description leaned on "personal-use," "single recipient," and "single-tenant," which carrier vetting reads as a signal of disguised P2P messaging (the same underlying issue as Session 7's Rejection 1, just resurfacing in a subtler form).
- Rewrote the description to drop that language and instead state sender/recipient/purpose plainly: *"Plant Guide is a home plant care management application. Its Firebase Cloud Functions backend sends automated SMS reminders to a phone number entered into the app's notification settings by the administrator, alerting the recipient which houseplants need watering that day. Messages are sent at most once per day, only on days when a plant is due for watering, and only during active trip periods configured in the app. Reply STOP to opt out or HELP for help."* Brock submitted this verbatim.
- Verified in Trust Hub that the Assigned A2P Brand is named **"Plant Guide"** (Approved) — matches how the new description refers to itself, so no brand/description mismatch expected this round.
- **Current status: "In Review" again.** Twilio's own banner states review "may take several weeks," which will likely outlast the trip start — treat this as out of our hands until Twilio responds; no further description changes needed unless another rejection comes in.

**Backup plan established (in case A2P never approves in time):** No code changes needed — SendGrid email has worked independently of Twilio since Session 4. Confirmed via code read of `functions/index.js`'s `sendViaChannel()`: on channel `'both'`, email is always attempted *before* text with no shared try/catch, so a Twilio failure never blocks or retracts an already-sent email. **Brock has left the channel setting as "Email only"** in Admin Panel → Notifications — this alone fully covers the trip regardless of Twilio's outcome. ("Email and text" would be a strict upgrade with no downside — auto-picks up SMS if the campaign approves mid-trip — but Brock chose to leave it on email only, so respect that unless he asks to change it.)

**Twilio account closure steps (given to Brock as reference, not executed):** if he decides to abandon Twilio — (1) release the phone number in Console → Phone Numbers → Manage → Active Numbers to stop recurring charges, (2) zero out any Billing balance, (3) Console → Account → General Settings → Close Account (or a support ticket if that option isn't available for the account type). Brand/Campaign registration fees already paid are non-refundable. Not acted on this session — Twilio account is still active and the campaign is still in review.

**No code or file changes this session** — all work was Twilio-console troubleshooting via Brock's screenshots plus one read of `functions/index.js` to verify send-order/error-isolation behavior. Nothing to deploy.

**Everything pending — pick up here next session:**
1. **Check Twilio A2P Campaign status again** — "In Review" as of this session, brand name now confirmed matching, may take weeks per Twilio's own estimate. If rejected again, get the exact new error code before guessing at another rewrite.
2. **Resolve the plant photo identification from Session 7 Phase 5** — Brock said he'll redo this "separately, targeting tomorrow" (2026-09-27): fresh photos of each plant with corrected locations, plus names/species for the two unidentified new plants. Do not write guessed locations into Firestore without this.
3. **Once #2 is resolved:** use the bulk-edit v2 flow to update locations, add the two new plants via "+ Add New Plant," and get fall/winter watering-frequency numbers from Brock (same open item as Session 7).
4. **Install Playwright MCP** (Session 7 Phase 7 command) — still not installed; use it to functionally test bulk-edit v2 before the pre-trip data entry.
5. Standing note, no action: `GMAIL_APP_PASSWORD` unused secret in Firebase Secret Manager (Session 4) — harmless noise.

---

### Session 9 — Plant re-photo, window-location sections, relocation data update (2026-09-27)

- Brock photographed every plant into `Plant Pictures/<Window>/` folders (31 photos). IDs were worked out photo-by-photo with Brock's corrections — **trust his in-person IDs over photo reads**; several of my initial visual guesses were wrong (e.g. Stair_0030 is the red Aglaonema #26, not Stromanthe).
- Outcome: 4 locations (Desk / Kitchen / Living Room / Stairwell Window), #10 and #16 each split into two pots (new #30, #31), two new species (#32 Pink Nerve Plant, #33 Baby Rubber Plant), #25 African Violet deceased. Full list in Plant Inventory above.
- All Plants (`PlantGrid.jsx`), the Today tab's due list (`TodayTasks.jsx`), the Admin Panel home plant list and bulk-edit select list (`AdminPanel.jsx`) all render in sections per window, via the shared `groupByLocation()` in `src/data/locations.js` (fixed order, catch-all "Other"). Section headers (`.location-section__title`) are 20px bold `--green-700`. "Completed today" is still one flat list. The Admin home list puts inactive plants in a trailing "Removed" section. Header rule is `.location-sections .location-section__title` on purpose — `.admin-section h3` would otherwise override it.
- **Bulk edit v3 (replaces the v2 select-then-apply screen from Session 7):** the Admin Panel home plant list itself is now the selector — each active row has a checkbox + 72px photo + Edit/Remove, with "Select all plants" on top. Selecting anything shows a sticky bar with **Update location** (dropdown of the four windows, so no typo'd locations), **Add past watering** (date picker, defaults to today, calls `logWateringOnDate` per plant), and **Watering schedule** (min/max days + method, blank = no change). Each opens a centered pop-up (`.dialog-overlay`) that lists the affected plants and only closes via Cancel/Apply. The admin backdrop won't close the panel while plants are selected. The standalone `view === 'bulk-edit'` screen is gone.
- Data was applied via a one-time client-side update, `src/data/relocation2026.js`, called from `usePlants`. It runs once on the first app load after deploy, in a single Firestore batch, and sets `config/migrations.relocation2026_09 = true` so it never re-runs or overwrites later Admin Panel edits. #30/#31 are cloned from the live #10/#16 docs (minus any `nextWaterDate` override).
- **Privacy fix:** every published plant photo carried iPhone GPS EXIF pointing at Brock's home. All `public/images/plant-*.jpg` were re-encoded without EXIF (Pillow in a scratch venv; no exiftool on this machine). Raw `Plant Pictures/` is gitignored. The old GPS-tagged images still exist in the public repo's git history — cleaning that needs a history rewrite + force-push, not done; Brock's call (making the repo private is the simpler option).
- `claude` CLI is not on PATH inside the VSCode extension, so `claude mcp add` doesn't work from Bash here — add Playwright via `/mcp` → Add server (stdio: `npx -y @playwright/mcp@latest`) or a root `.mcp.json`, then restart.
- Commits `caf247d` (relocation), `e6e7978` (header style), `e292203` (Today sections), `83a4b8c` (bulk-edit list sections), `fdb61fa` (Admin list sections + "Removed"), `5e68c04` (bulk edit v3), `9cd0467` (trip moved to 10/15) — all deployed and confirmed live; Brock confirmed the views and tested bulk Add past watering.

- **Trip moved:** on 2026-09-28 Brock changed the India trip start to **10/15/26** (was 10/1) in Admin Panel → Trip. Emails are trip-gated, so they follow the new dates with no code change.
- Brock tested bulk **Add past watering** on the live site — works. Update location / Watering schedule pop-ups not yet exercised.

**Pending:**
1. ~~Confirm relocation applied~~ — confirmed by Brock 2026-09-27.
2. Twilio A2P Campaign still "In Review" (see Session 8); email-only notifications cover the trip.
3. Fall/winter watering intervals — still never provided by Brock.
4. #16/#31 `lightNeeds` still say "Direct south sun" from the old spot; review light/care notes for moved plants.
5. Install Playwright MCP to click-test the window sections and the bulk-edit v3 pop-ups (only server-render smoke-tested so far).

---

### Session 10 — Installable iPhone app + push reminders (2026-09-28)

**Goal (Brock):** use it like a normal iPhone app, for him plus Cole/sitters. Reminders: Brock's phone **every day** plants are due; everyone else **only during a set trip**. Chose a PWA over an App Store app (no $99/yr, sitters just "Add to Home Screen").

- **Installable:** `public/manifest.json` (scope/start `/plant-guide/`, standalone), `apple-touch-icon.png` / `icon-192.png` / `icon-512.png` (rendered from the 🌿 emoji via `qlmanage`, full-bleed since iOS rounds corners), iOS meta tags in `index.html`.
- **Service worker `public/sw.js`:** only shows pushes + opens the app on tap. **No offline caching on purpose** — a SW cache on top of GitHub Pages caching would hide deploys.
- **Push via Firebase Cloud Messaging** (default FCM VAPID key — no console setup, no new secrets). `src/hooks/useReminders.js` registers the SW, gets a token, and stores one doc per phone in Firestore `devices/{random deviceId}` = `{ token, name, alwaysRemind, updatedAt }` (deviceId + name in localStorage; name is also used as `wateredBy` on Mark Watered). Token refreshed on each app open.
- **`RemindersCard`** at the top of the Today tab: install steps on iPhone Safari → name + "Turn on reminders" in the installed app → "Reminders on" with **Send test** / **Turn off**. The **every-day** checkbox (setup and on-card toggle) only shows when admin-unlocked (PIN) — that's how Brock's phone differs from sitters'. "Not now" leaves a small re-open link.
- **Functions:** `dailyWateringNotification` now loads due plants first, pushes to `alwaysRemind` devices every day and to all devices when a trip is active **and** the Notifications "enabled" switch is on, then (trip only) sends the email/text as before. New callable `sendTestPush({deviceId})`. Dead tokens are deleted automatically. Push text is grouped by window.
- **iOS gotchas learned:** (1) a data-only FCM message was accepted by FCM but never shown — adding a `webpush.notification` block fixed delivery; (2) notifications landed in Notification Center with **no banner** — that's the phone's per-app setting (Settings → Notifications → Plants → Banners, Scheduled Summary, Focus), not the app. Tell every new user to check it.
- Brock's phone: installed, reminders on, test push delivered (banner setting pending on his side).
- Twilio is now likely unnecessary — push covers "text-like" reminders. Decide later whether to close the account (steps in Session 8).
- **Follow-ups (2026-09-30):** Brock asked whether sharing the home-screen bookmark by text to Cole works — yes, but Cole still has to open it in Safari and Add to Home Screen. Confirmed Cole's phone is trip-only automatically (the every-day option needs the PIN), and her daily pushes need both an active trip and the Notifications "enabled" switch. Documentation overhauled: CLAUDE.md reference sections (stack, directory tree, Firestore data model, deploy for frontend vs functions, photo/EXIF rule, architecture decisions, phone onboarding), `plant_care_guide.md` current-locations section, and memory files.
- Commits: `54edcf4` (installable app + push), `5e6cc9a` (iOS delivery fix + every-day toggle), `47f1d8a` / later (docs).

---

### Session 11 — Twilio abandoned (2026-10-01)

- A2P campaign came back **rejected** again: 30882 (terms), 30896 (opt-in), 30908 (privacy policy). Root cause: no public written opt-in form; the privacy policy itself says numbers aren't collected via public sign-up. Fixing it would mean a third multi-week review that would probably finish after the trip starts.
- Brock agreed: push notifications cover it better. He's closing the Twilio account (Console → Admin → Account Management → General settings → Close account; Twilio refunds remaining prepaid balance within ~10 business days).
- Admin → Notifications is now **email only**: channel picker and phone field removed, save always writes `channel: 'email'`, button renamed "Send Test Email". Functions untouched (they already default to email).

## Current Open Items (as of 2026-10-01)

1. **Cole's phone** — install the app and turn on reminders before the trip (now starting **10/15/26**; end date is in Admin Panel → Trip). Have her run **Send test** and check the banner setting.
2. **Brock's banner setting** — confirm banners pop up after changing Settings → Notifications → Plants.
3. **Twilio** — abandoned 2026-10-01 (Session 11). Brock is closing the account; confirm the balance refund arrived (~10 business days). Optional cleanup: delete the 3 `TWILIO_*` secrets + SMS code from functions.
4. **Fall/winter watering intervals** — never provided; Brock can enter them himself via Admin → select plants → **Watering schedule**.
5. **Care notes for moved plants** — `lightNeeds` / `careNotes` still describe old spots (e.g. #16/#31 "Direct south sun"). Window orientations for Desk/Stairwell are unknown — ask before rewriting.
6. **Click-test** the Update location and Watering schedule pop-ups (only Add past watering has been tried by Brock).
7. **Optional:** scrub GPS-tagged photos from public git history (force-push) or make the repo private; group "Completed today" by window; group the reminder email by window.

