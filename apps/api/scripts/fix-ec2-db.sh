#!/usr/bin/env bash
# Fix Supabase DATABASE_URL for IPv4 EC2 (Tokyo session pooler) and verify.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL='postgresql://postgres.mthszltbwkoxvjpyvpqp:Nris%40nr786123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=15'

touch .env
# Remove any existing DATABASE_URL lines (duplicates cause confusion)
grep -v '^DATABASE_URL=' .env > .env.tmp || true
mv .env.tmp .env
printf 'DATABASE_URL="%s"\n' "$DB_URL" >> .env

echo "=== DATABASE_URL host ==="
node -e "
const { config } = require('dotenv');
config({ path: '.env', override: true });
const u = new URL(process.env.DATABASE_URL);
console.log('host=', u.hostname);
console.log('port=', u.port || '5432');
console.log('user=', u.username);
if (u.hostname !== 'aws-1-ap-northeast-1.pooler.supabase.com') {
  console.error('WRONG HOST');
  process.exit(1);
}
"

echo "=== DB ping ==="
node -e "
const { config } = require('dotenv');
config({ path: '.env', override: true });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRawUnsafe('SELECT 1 AS ok')
  .then(async (r) => { console.log('DB OK', r); await p.\$disconnect(); })
  .catch(async (e) => { console.error('DB FAIL', e.message); await p.\$disconnect(); process.exit(1); });
"

echo "Done. Now: git pull && npm run build && pm2 delete codesthinkerlms; pm2 flush; pm2 start dist/main.js --name codesthinkerlms --cwd \$PWD && pm2 logs"
