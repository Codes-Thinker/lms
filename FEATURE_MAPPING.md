# Codes Thinker LMS — Feature Mapping (Phase 1 Audit)

**Website:** https://codesthinker.com/  
**Date:** 2026-11-12

## 1. What exists today

| App | Stack | Location |
|-----|--------|----------|
| Admin Web | Next.js 14 + Tailwind + mock data | `apps/web-admin` |
| Mobile (Student / Intern / Staff) | Flutter + Provider + mock data | `apps/mobile-flutter` |
| Backend API | **Not present** | — |
| Database / Prisma | **Not present** | — |

Admin + Flutter share **aligned mock IDs** (e.g. `u-student-1`, `u-intern-1`, `u-staff-1`). Live NestJS sync is Phase 2+.

## 2. Admin role tabs (current)

| Tab | Admin actions | App counterpart |
|-----|---------------|-----------------|
| **Students** | Roster, fee reminders, mark paid, view report | Student login · Fees · Report · Attendance |
| **Interns** | Roster, assign projects, status updates | Intern login · Projects tab · Attendance |
| **Staff** | Roster, assign tasks (timer/chat-ready) | Staff login · Tasks · Attendance |
| **Attendance** | APP feed with device mark time | Self-mark · auto PRESENT/LATE after 10:05 |
| **Notifications + Snackbar** | Bell + toast after every admin action | SnackBars after mark / task / chat |

## 3. Mobile roles

| Login role | Bottom tabs |
|------------|-------------|
| Student | Home · Tasks · Attend · Fees · Profile |
| Intern | Home · Projects · Attend · Report · Profile |
| Staff | Staff home · Tasks · Attend · Report · Profile |

Attendance mark uses **real `DateTime.now()`** via `UiProvider` clock + `AttendanceProvider.autoStatus`.

## 4. Admin modules vs production checklist

| Module | Status |
|--------|--------|
| A. Dashboard overview | Done (mock KPIs + APP attendance) |
| B. Students | Done (fees + reports UI) |
| C–D. Staff / Interns | Done (tasks + projects UI) |
| E–F. Courses + outline | Partial |
| K. Attendance | Done (APP feed + correct) |
| N. Notifications | Done (in-app bell + snackbars) |
| NestJS / Prisma / JWT | Missing |

## 5. Mock people baseline

| Role | Name | Email |
|------|------|-------|
| Super Admin | **Ayaz Aslam** | ayaz@codesthinker.com |
| Staff | Hassan Raza | hassan@codesthinker.com |
| Intern | Usman Tariq | usman@codesthinker.com |
| Student | Ali Khan | ali@codesthinker.com |
| Student | Fatima Noor | fatima@codesthinker.com |
| Student | Bilal Ahmed | bilal@codesthinker.com |
