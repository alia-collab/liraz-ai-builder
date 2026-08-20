# Firebase Auth — Liraz AI Builder

Login is **Firebase** (email/password + Google). The app then creates an HttpOnly session cookie and a Prisma user.

## 1. Create a Firebase account and project

1. Open [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with Google.
2. Click **Add project** / **Create a project**.
3. Name it `liraz-ai-builder` (or similar). Google Analytics is optional — you can skip it.
4. Wait until the project is ready, then open it.

## 2. Enable Email and Google sign-in

1. Left menu: **Build** → **Authentication**.
2. Click **Get started**.
3. **Sign-in method** tab:
   - **Email/Password** → Enable → Save.
   - **Google** → Enable → choose a project support email (use `liraz@lirazai.com`) → Save.

## 3. Allow the website domains

**Authentication** → **Settings** → **Authorized domains**. Add:

- `localhost`
- `lirazai.com`
- `www.lirazai.com`
- your Vercel host, e.g. `liraz-ai-builder.vercel.app`

Without these, Google login shows `auth/unauthorized-domain`.

## 4. Register a Web app (client keys)

1. Project **gear** → **Project settings**.
2. **Your apps** → add a **Web** app (`</>`).
3. Nickname: `lirazai-web`. Do not enable Firebase Hosting.
4. Copy the config values into Vercel / `.env`:

| Firebase field | Env var | Safe to expose? |
|---|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes |

`authDomain` is usually `YOUR_PROJECT_ID.firebaseapp.com`.

A service-account JSON key is **not required**. Google may block "Generate new private key". The server verifies login with Google's public keys and `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

You still need:

- `DATABASE_URL` = hosted Postgres (Neon/Supabase), **not** `localhost`
- `NEXTAUTH_SECRET` (or `AUTH_SECRET`) = session cookie signing key
- `NEXT_PUBLIC_APP_URL` = `https://lirazai.com`
- `SUPER_ADMIN_EMAIL` = `liraz@lirazai.com` so that email keeps Super Admin after first Firebase login

After deploy, `https://lirazai.com/api/health/auth` should show:

- `firebaseClientConfigured: true`
- `firebaseAdminConfigured: true`
- `secretConfigured: true`
- `ok: true`

## Local `.env`

Copy the same keys into `.env`. Restart `npm run dev`. Open `http://localhost:3000/login`.
