import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/** Original dashboard font family */
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Code's Thinker LMS",
  description: "Attendance, daily tasks, employment & courses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
