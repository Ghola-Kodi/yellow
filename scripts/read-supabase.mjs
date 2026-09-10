#!/usr/bin/env node
/**
 * read-supabase.mjs — dump Supabase table/view data to your terminal so you
 * can paste it back to me.
 *
 * Zero dependencies: uses Node's native fetch (Node >= 18) against the
 * Supabase PostgREST REST API. No SDK install required.
 *
 * Credentials are read from process.env first, then from a `.env.local` file
 * (and `.env`) in the project root, if present. The service-role key is used
 * so you can read every table regardless of RLS.
 *
 * Usage:
 *   node scripts/read-supabase.mjs <table> [options]
 *
 * Examples:
 *   node scripts/read-supabase.mjs payment_failures
 *   node scripts/read-supabase.mjs payment_failures --limit=20 --order=created_at.desc
 *   node scripts/read-supabase.mjs payment_failures --filter=status.eq.recovered
 *   node scripts/read-supabase.mjs payment_failures --select=id,customer_email,status,decline_code
 *   node scripts/read-supabase.mjs flow_performance --csv
 *
 * Options:
 *   --select=col1,col2        columns to return (default *)
 *   --filter=col.op.value     PostgREST filter; repeatable (e.g. --filter=decline_type.eq.hard)
 *   --order=col.desc          sort order; repeatable
 *   --limit=N                 max rows
 *   --offset=N                skip N rows
 *   --csv                     output CSV instead of pretty JSON
 *   --table-list              print known tables/views instead of querying
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Load .env.local / .env without overwriting real process.env
// ---------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

function loadEnvFileIfPresent(name) {
  const path = resolve(projectRoot, name);
  if (!existsSync(path)) return;
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFileIfPresent('.env.local');
loadEnvFileIfPresent('.env');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const KNOWN_TABLES = [
  'payment_failures',
  'profiles',
  'demo_requests',
  // views
  'dunning_resolution_by_industry',
  'flow_performance',
  'active_dunning_cases',
  'customer_dunning_summary',
  'demo_conversion_funnel',
];

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`read-supabase.mjs — read Supabase data via REST

Usage:
  node scripts/read-supabase.mjs <table> [options]

Options:
  --table-list           list known tables/views
  --select=col1,col2
  --filter=col.op.value  (repeatable)
  --order=col.desc       (repeatable)
  --limit=N
  --offset=N
  --csv                  CSV output instead of JSON

Known tables/views: ${KNOWN_TABLES.join(', ')}
`);
  process.exit(0);
}

if (args.includes('--table-list')) {
  console.log(KNOWN_TABLES.join('\n'));
  process.exit(0);
}

const table = args.find((a) => !a.startsWith('--'));
const flags = args.filter((a) => a.startsWith('--'));

function flagValue(name, fallback) {
  const exact = flags.find((f) => f.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return fallback;
}

const select = flagValue('--select', '*');
const limit = flagValue('--limit', null);
const offset = flagValue('--offset', null);
const asCsv = flags.includes('--csv');
const filters = flags.filter((f) => f.startsWith('--filter=')).map((f) => f.slice('--filter='.length));
const orders = flags.filter((f) => f.startsWith('--order=')).map((f) => f.slice('--order='.length));

if (!table) {
  console.error('❌ No table specified. Known tables/views:');
  console.error(KNOWN_TABLES.join('\n'));
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌ Missing credentials. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in a\n' +
      '   .env.local file (or the environment). Example:\n' +
      '   SUPABASE_URL=https://your-project.supabase.co\n' +
      '   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service role, not anon, for full read access)'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build the PostgREST query
// ---------------------------------------------------------------------------
const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
url.searchParams.set('select', select);
if (limit) url.searchParams.set('limit', limit);
if (offset) url.searchParams.set('offset', offset);
for (const order of orders) url.searchParams.append('order', order);
for (const filter of filters) {
  const firstDot = filter.indexOf('.');
  if (firstDot === -1) {
    console.error(`❌ Bad filter "${filter}" — expected col.op.value`);
    process.exit(1);
  }
  const col = filter.slice(0, firstDot);
  const rest = filter.slice(firstDot + 1);
  const secondDot = rest.indexOf('.');
  const expr = secondDot === -1 ? `eq.${rest}` : rest; // default operator is eq
  url.searchParams.set(col, expr);
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
let response;
try {
  response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });
} catch (error) {
  console.error('❌ Network error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

const text = await response.text();
let data;
try {
  data = text ? JSON.parse(text) : null;
} catch {
  data = text;
}

if (!response.ok) {
  console.error(`❌ Supabase returned ${response.status} ${response.statusText}`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
if (asCsv) {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) {
    console.log('');
    process.exit(0);
  }
  const keys = [...new Set(rows.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : [])))];
  console.log(keys.join(','));
  for (const row of rows) {
    console.log(
      keys
        .map((k) => {
          const v = row?.[k];
          if (v === null || v === undefined) return '';
          const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    );
  }
} else {
  console.log(JSON.stringify(data, null, 2));
}
