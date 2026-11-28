import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Code's Thinker LMS",
  description:
    "How Code's Thinker LMS collects and uses account, photo, location, and notification data.",
};

const CONTACT_EMAIL = "ayaz@codesthinker.com";
const UPDATED = "28 November 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <article className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Code&apos;s Thinker LMS
          </p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: {UPDATED}</p>
        </header>

        <p className="text-sm leading-relaxed text-slate-700">
          This policy explains what data the Code&apos;s Thinker LMS mobile app
          and admin portal collect, why we collect it, and how you can contact
          us. The app is used by students, interns, and staff of Codes Thinker
          for learning, attendance, fees, tasks, and related operations.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            1. Account &amp; profile
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            We store your name, email, phone (if provided), role (student,
            intern, or staff), batch/course assignment, and account status so
            you can sign in and use LMS features. Profile photos you upload are
            stored with your account and shown in the app and admin tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            2. Location (staff attendance)
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            For staff office attendance, the app may use precise location
            (including while the app is in the background, when you allow
            &quot;all the time&quot;) to confirm you are at the registered
            office geofence. Location is used only for attendance and related
            alerts—not for advertising.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            3. Photos &amp; media
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Camera and gallery access are used when you choose to set a profile
            photo or attach screenshots (for example fee payment proof). Media
            is uploaded only when you take that action.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            4. Notifications
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            With your permission we send push and in-app notifications about
            tasks, fees, leave, chat, and attendance. You can disable
            notifications in system settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            5. Learning &amp; operations data
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Course progress, quizzes, certificates, fees, leave requests, tasks,
            and support messages are stored so admins and instructors can run
            the institute and so you can see your own records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            6. How we use &amp; share data
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Data is used to operate the LMS, authenticate users, provide
            features you request, and keep the service secure. We do not sell
            personal data. Service providers that host our API, database, or
            push notifications process data only to deliver those services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">7. Retention</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            We keep account and academic records while your account is active
            and as needed for institute operations or legal requirements. You
            may request account deletion from the app profile (where available)
            or by contacting us.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">8. Security</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Access is protected with authenticated sessions. Production traffic
            uses HTTPS. Only authorized staff can access admin tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">9. Children</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            The app is intended for institute students, interns, and staff. It
            is not directed at children under 13.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">10. Contact</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Questions or privacy requests:{" "}
            <a
              className="font-medium text-blue-700 underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <footer className="border-t border-slate-100 pt-4 text-sm text-slate-500">
          <Link href="/login" className="text-blue-700 hover:underline">
            Admin sign-in
          </Link>
        </footer>
      </article>
    </main>
  );
}
