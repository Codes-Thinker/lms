import { PrismaClient } from "@prisma/client";

const urls = [
  process.env.DATABASE_URL,
  "postgresql://postgres:Nris%40nr786123@db.mthszltbwkoxvjpyvpqp.supabase.co:5432/postgres?sslmode=require&connect_timeout=15",
  "postgresql://postgres.mthszltbwkoxvjpyvpqp:Nris%40nr786123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connect_timeout=15",
  "postgresql://postgres.mthszltbwkoxvjpyvpqp:Nris%40nr786123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=15",
];

for (const u of urls) {
  if (!u) continue;
  const p = new PrismaClient({ datasources: { db: { url: u } } });
  try {
    await p.$queryRawUnsafe("SELECT 1");
    console.log("SUCCESS", u.slice(0, 80));
  } catch (e) {
    console.log("FAIL", u.slice(0, 80), String(e.message).split("\n")[0]);
  } finally {
    await p.$disconnect().catch(() => {});
  }
}
