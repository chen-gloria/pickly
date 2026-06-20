# 🌐 Deploying the Pickly backend

Your phone can't reach `localhost`, so the API needs to live on the internet.
This repo is ready for two easy paths. **Render is recommended** if you want the
simplest, no-credit-card start.

---

## Option A — Render (recommended, free, no credit card)

Render reads `render.yaml` and sets up everything (API + Postgres + secret) for you.

1. Sign up at **[render.com](https://render.com)** (use "Sign in with GitHub").
2. Dashboard → **New +** → **Blueprint**.
3. Connect your **`chen-gloria/pickly`** repo and click **Apply**.
4. Render creates `pickly-api` + `pickly-db`, wires them together, and deploys.
   First deploy takes ~3–5 minutes.
5. Your live URL appears, e.g. `https://pickly-api.onrender.com`.
   Open `<that URL>/docs` to confirm it works. The database auto-seeds on first boot.

> Free notes: the free web service "sleeps" after 15 min idle (first request after
> that is slow), and the free Postgres expires after ~30 days. Upgrade to paid
> (~US$7/mo each) when you're ready for real users.

---

## Option B — Fly.io (CLI-driven; needs a card on file)

You already have `flyctl` installed. From the repo:

```bash
fly auth login                       # opens browser
cd backend
fly launch --no-deploy               # creates fly.toml (say no to extra prompts)
fly postgres create --name pickly-db # create a Postgres cluster
fly postgres attach pickly-db        # sets DATABASE_URL automatically
fly secrets set SECRET_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))")
fly deploy
```

When it finishes, `fly open` launches your live API. The DB auto-seeds on first boot.

---

## After deploying (either option)

1. Copy your live API URL.
2. Edit **`mobile/src/config.js`** → set `API_URL` to that URL.
3. Commit & push:
   ```bash
   git add mobile/src/config.js && git commit -m "Point app at live API" && git push
   ```
4. Restart Expo (`npx expo start`) — the app now works on a real phone over the
   internet, no Wi-Fi requirement.

## Updating the backend later
Just push to `main`. Render auto-redeploys; for Fly run `fly deploy` again.
