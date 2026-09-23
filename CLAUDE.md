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
| Text | Twilio | SMS notifications via Cloud Functions; channel toggle (email/text/both) set in Admin Panel |
| Functions | Firebase Cloud Functions v2 | Scheduled daily notification (trip-gated, only for plants due that day) + on-demand test notification |

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
    │   ├── images/                  ← plant photos: plant-1.jpg through plant-29.jpg
    │   ├── privacy-policy.html      ← static page, required for Twilio A2P 10DLC campaign registration
    │   └── terms.html               ← static page, required for Twilio A2P 10DLC campaign registration
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
