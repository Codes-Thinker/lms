# Code's Thinker LMS

Learning Management System monorepo:

- `apps/mobile-flutter` — Student / Intern / Teacher–Staff mobile app
- `apps/web-admin` — Admin dashboard (Next.js)
- `apps/api` — NestJS + Prisma API

## Stack

Flutter (Provider) · Next.js · NestJS · Prisma · Postgres (Supabase) · Firebase Cloud Messaging

## Local setup (high level)

1. API: set `DATABASE_URL`, run Prisma migrate, start Nest
2. Web admin: `npm install` + `npm run dev`
3. Mobile: `flutter pub get` + configure Firebase (`flutterfire configure`)

## Roles

Student · Intern · Teacher / Staff · Super Admin
# lms
