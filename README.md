# 🛒 Pickly — Grocery Price Comparison App

Compare grocery prices across **Woolworths, Coles, ALDI and IGA**, build a shopping
list, save favorites, and set price-drop alerts. Built with **Python (FastAPI)** +
**React Native (Expo)**.

```
pickly/
├── backend/    Python FastAPI API + database + pluggable price sources
└── mobile/     React Native (Expo) app — iOS & Android
```

---

## ✅ What works today
- Email signup / login (secure, token-based)
- Product search + category filters
- **Side-by-side price comparison** with cheapest store highlighted + savings
- Shopping list (add, check off, remove)
- Favorites
- Price alerts
- Sample Australian grocery data out of the box

---

## 🏃 Run it locally (15 minutes)

You need two terminals: one for the backend, one for the app.

### 1. Backend (Python)

> Requires Python 3.11–3.13 recommended.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then optionally edit .env
python -m app.seed                 # loads stores + sample products
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs to explore the API.

### 2. Mobile app (React Native / Expo)

```bash
cd mobile
npm install
npx expo start
```

Then:
- **On your phone:** install **Expo Go** from the App Store / Play Store, scan the QR
  code in the terminal. ⚠️ First edit `mobile/src/config.js` and set `API_URL` to your
  computer's IP, e.g. `http://192.168.1.23:8000` (find it with `ipconfig getifaddr en0`).
  Your phone and computer must be on the same Wi-Fi.
- **iOS Simulator** (Mac): press `i`. Keep `API_URL` as `http://localhost:8000`.
- **Android Emulator:** press `a`. Set `API_URL` to `http://10.0.2.2:8000`.

---

## 📦 Tech
| Layer | Choice | Why |
|---|---|---|
| Mobile | React Native + Expo | One codebase → iOS & Android; easy launching |
| Backend | Python + FastAPI | Fast, modern, auto API docs |
| Database | SQLite (dev) → Postgres (prod) | Zero-config locally, scalable in production |
| Auth | JWT tokens + bcrypt | Standard, secure |

## 📈 Price data
See [`backend/app/datasources/README.md`](backend/app/datasources/README.md). The data
layer is **pluggable**: we start with manual/admin data and can add affiliate feeds or
scrapers later without touching the rest of the app.

## 🚀 Launching to the App Store & Google Play
See **[LAUNCH.md](LAUNCH.md)** for the full step-by-step guide and costs.
