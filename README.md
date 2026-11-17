# Code's Thinker LMS

Monorepo:

- `apps/mobile-flutter`: Student / Intern / Teacher mobile app
- `apps/web-admin`: Admin dashboard (Next.js)
- `apps/api`: NestJS + Prisma API

## Stack

Flutter (Provider), Next.js, NestJS, Prisma, Postgres, Firebase Cloud Messaging

## Local setup

1. **API**: set `DATABASE_URL` in `apps/api/.env`, then:
   ```bash
   cd apps/api && npm install && npx prisma migrate deploy && npm run start:dev
   ```
2. **Web admin**
   ```bash
   cd apps/web-admin && npm install && npm run dev
   ```
3. **Mobile**
   ```bash
   cd apps/mobile-flutter && flutter pub get && flutter run
   ```
   Optional local API: `--dart-define=API_BASE=http://YOUR_LAN_IP:4000`

## Production (Render)

Blueprint: `apps/api/render.yaml`

Required env on Render:

- `DATABASE_URL`
- `JWT_SECRET` (auto if using Blueprint)
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `APP_URL` / `API_URL` / `CORS_ORIGIN` as needed
- `CRON_SECRET` for `POST /ops/cron/fee-reminders` and `POST /ops/cron/auto-checkout`
- `JWT_EXPIRES_IN` (default `12h`) + refresh tokens

Health check: `GET /health`

DB backup helper: `apps/api/scripts/backup-db.sh`

Mobile release APK (after `flutter build apk --release`):

`apps/mobile-flutter/build/app/outputs/flutter-apk/app-release.apk`

## Quizzes and certificates

- Admin: `/quizzes`, `/certificates`
- Public verify: `/verify/CT-XXXX-XXXX-XXXX` (admin web) or `GET /certificates/verify/:code` (API)
- Mobile Help hub: Quizzes + Certificates
- Passing a published quiz (enrolled students) can auto-issue a course certificate

## Roles

Student, Intern, Teacher / Staff, Super Admin
