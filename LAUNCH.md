# 🚀 Launching Pickly to the App Store & Google Play

A beginner-friendly, step-by-step guide. We use **EAS** (Expo Application Services) —
it builds your iOS and Android apps **in the cloud**, so you don't need a Mac with
Xcode set up perfectly, and Android works from any computer.

---

## 💰 Costs (read first)

| Item | Cost | When |
|---|---|---|
| **Apple Developer Program** | **US$99 / year** | Required to publish to iOS |
| **Google Play Developer** | **US$25 one-time** | Required to publish to Android |
| **EAS build** | **Free tier** is enough to start | Paid plans (~US$19+/mo) only if you build a lot |
| **Backend hosting** | **Free → ~US$7/mo** | Railway / Render / Fly.io |
| **Database (Postgres)** | **Free → ~US$10/mo** | Often bundled with hosting |
| **Push notifications** | **Free** | Expo Push |

➡️ **Minimum to be live on both stores in year one: ~US$125.**

---

## Step 0 — One-time setup

```bash
npm install -g eas-cli
cd mobile
eas login          # create a free Expo account if you don't have one
eas build:configure
```

This creates an `eas.json` file. Commit it to git.

---

## Step 1 — Put your backend online

The app on a real phone can't reach `localhost`. Deploy the `backend/` folder:

1. Create a free account at **[Railway](https://railway.app)** (easiest) or Render.
2. New Project → Deploy from GitHub → pick this repo, root = `backend`.
3. Add a **PostgreSQL** database (one click). Railway sets `DATABASE_URL` for you.
4. Add environment variables: `SECRET_KEY` (a long random string).
5. Set the start command:
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. After it deploys, run the seed once (Railway shell): `python -m app.seed`.
7. Copy your live URL, e.g. `https://pickly-api.up.railway.app`.
8. In `mobile/src/config.js`, set `API_URL` to that URL. Commit.

---

## Step 2 — Android (Google Play)

1. Pay the **US$25** one-time fee at
   [play.google.com/console](https://play.google.com/console).
2. Build the app (cloud):
   ```bash
   cd mobile
   eas build --platform android --profile production
   ```
   This produces an `.aab` file (download link shown when done).
3. In Play Console: **Create app** → fill in name, description, screenshots,
   privacy policy URL, content rating.
4. **Production → Create new release** → upload the `.aab` → roll out.
5. First review usually takes a few hours to ~2 days.

> 💡 Even faster: `eas submit --platform android` uploads the build for you.

---

## Step 3 — iOS (App Store)

> You can build iOS from any OS with EAS, but you need the Apple membership.

1. Enrol in the **Apple Developer Program** (US$99/yr) at
   [developer.apple.com](https://developer.apple.com/programs/).
2. Build:
   ```bash
   cd mobile
   eas build --platform ios --profile production
   ```
   EAS will walk you through Apple login and certificates automatically.
3. Submit to App Store Connect:
   ```bash
   eas submit --platform ios
   ```
4. At [appstoreconnect.apple.com](https://appstoreconnect.apple.com): create the app
   listing (name, screenshots, description, privacy details), attach the build,
   and **Submit for Review**.
5. Apple review typically takes 1–3 days.

---

## Step 4 — Things both stores require (prepare these)

- **App icon** (1024×1024) — replace `mobile/assets/icon.png`.
- **Screenshots** — take them from the simulator/phone (a few per device size).
- **Privacy policy URL** — both stores require one. A free generator is fine to start.
- **Short + full description**, and a support email.
- **Data safety / privacy questionnaire** — you collect email + (later) location;
  declare it honestly.

---

## Step 5 — Updating the app later

For JavaScript-only changes (most updates), you can push instantly without a new
store review using **EAS Update**:

```bash
eas update --branch production --message "Fixed price display"
```

Native changes (new permissions, SDK upgrades) need a new `eas build` + store submit.

---

## Recommended order for you
1. ✅ Get it running locally (see README).
2. Deploy backend (Step 1).
3. Launch **Android first** (cheaper, faster review) — Step 2.
4. Then **iOS** — Step 3.
5. Tell friends, gather feedback, iterate with `eas update`.

You've got this. 💪
