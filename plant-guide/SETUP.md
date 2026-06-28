# Plant Guide — Setup Instructions

This is a 3-step setup: Firebase → GitHub → Done.

---

## Step 1 — Create a Firebase project

1. Go to **console.firebase.google.com** (sign in with your Gmail: brock.gonzales@gmail.com)
2. Click **"Add project"** → name it something like `brocks-plant-guide` → click through the setup
3. Once inside the project, click **"Firestore Database"** in the left sidebar → **"Create database"**
   - Choose **"Start in test mode"** (you can tighten rules later)
   - Pick any region (us-central1 is fine)
4. Back on the project overview, click the **web icon `</>`** to register a web app
   - App nickname: `plant-guide`
   - Click **"Register app"**
5. You'll see a block of config values like this — **copy them**:
   ```
   apiKey: "AIza..."
   authDomain: "brocks-plant-guide.firebaseapp.com"
   projectId: "brocks-plant-guide"
   storageBucket: "brocks-plant-guide.appspot.com"
   messagingSenderId: "123456789"
   appId: "1:123456789:web:abc123"
   ```

---

## Step 2 — Set up the project locally

1. Open Terminal and navigate to the project:
   ```
   cd ~/Documents/Claude/Projects/Plants/plant-guide
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the environment file:
   ```
   cp .env.example .env.local
   ```
4. Open `.env.local` in any text editor and fill in your Firebase values from Step 1.
   Also set your admin PIN (any number you'll remember — this unlocks the admin panel):
   ```
   VITE_ADMIN_PIN=your-chosen-pin
   ```
5. Test it locally:
   ```
   npm run dev
   ```
   Open http://localhost:5173/plant-guide/ in your browser.
   The first load seeds all 27 plants into Firestore automatically.

---

## Step 3 — Deploy to GitHub Pages

1. Go to **github.com** and create a new repository named exactly **`plant-guide`**
   - Make it Public
   - Don't initialize with a README

2. In Terminal, from the `plant-guide/` directory:
   ```
   git init
   git add .
   git commit -m "Initial plant guide"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/plant-guide.git
   git push -u origin main
   ```
   (Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)

3. Add your Firebase secrets to GitHub:
   - Go to your `plant-guide` repo on GitHub
   - Click **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Add each of these as separate secrets (exact names matter):
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_ADMIN_PIN`

4. Enable GitHub Pages:
   - In your repo, go to **Settings** → **Pages**
   - Under "Source", select **GitHub Actions**

5. Trigger the first deploy:
   - Go to **Actions** tab in your repo
   - Click the workflow → **"Run workflow"**

6. After ~2 minutes, your site will be live at:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/plant-guide/
   ```

---

## Adding plant photos

Photos for Plants 24–27 need to be added manually:

1. Save the 4 photos from the conversation as:
   - `plant-24.jpg` — Wandering Dude (purple/silver)
   - `plant-25.jpg` — African Violet (deep purple flowers)
   - `plant-26.jpg` — Red Chinese Evergreen
   - `plant-27.jpg` — White/Cream Chinese Evergreen

2. Copy them into:
   ```
   plant-guide/public/images/
   ```

3. Commit and push — they'll appear in the app automatically.

For any future plant photos, name them `plant-{number}.jpg` and drop them in the same folder.

---

## Using the app

**For your housemate:**
- Share the GitHub Pages URL
- They open "Today" tab to see what needs watering
- Tap a task card to read the full instructions
- Hit "Mark as Watered" when done

**For you (from India or anywhere):**
- Open the same URL on your phone
- You'll see in real time which plants were watered and when

**Admin panel (⚙️ button, top right):**
- Enter your PIN
- Set trip dates + a note for your housemate before you leave
- Add, edit, or remove plants any time

---

## Adding a new plant in the future

1. Take a photo → save as `plant-{number}.jpg` → drop in `public/images/`
2. Open the app → ⚙️ → Add New Plant → fill in the form
3. Push the image to GitHub → the app updates automatically
