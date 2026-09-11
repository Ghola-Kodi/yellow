#!/usr/bin/env node
/**
 * klaviyo-inspect.mjs — list Klaviyo flows and metrics (and optionally fetch
 * one flow's details) so we can verify the API key and see what needs to be
 * created. Zero dependencies; reads KLAVIYO_PRIVATE_API_KEY from .env.local.
 *
 * Usage:
 *   node scripts/klaviyo-inspect.mjs flows
 *   node scripts/klaviyo-inspect.mjs metrics
 *   node scripts/klaviyo-inspect.mjs flow <flow-id>
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

function loadEnv(name) {
  const path = resolve(projectRoot, name);
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv('.env.local');
loadEnv('.env');

const key = process.env.KLAVIYO_PRIVATE_API_KEY ?? '';
if (!key) {
  console.error('❌ Missing KLAVIYO_PRIVATE_API_KEY in .env.local');
  process.exit(1);
}

const headers = {
  Authorization: `Klaviyo-API-Key ${key}`,
  revision: '2025-01-15',
  Accept: 'application/json',
};

async function getJson(url) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

const [cmd, arg] = process.argv.slice(2);

if (cmd === 'flows') {
  const { status, ok, body } = await getJson('https://a.klaviyo.com/api/flows/?page[size]=50');
  if (!ok) { console.error(`❌ ${status}`, JSON.stringify(body, null, 2)); process.exit(1); }
  console.log(`Flows (${body.data?.length ?? 0}):`);
  for (const f of body.data ?? []) {
    console.log(`  ${f.id}  ${f.attributes.name}  [status=${f.attributes.status}]`);
  }
} else if (cmd === 'metrics') {
  const { status, ok, body } = await getJson('https://a.klaviyo.com/api/metrics/');
  if (!ok) { console.error(`❌ ${status}`, JSON.stringify(body, null, 2)); process.exit(1); }
  console.log(`Metrics (${body.data?.length ?? 0}):`);
  for (const m of body.data ?? []) {
    console.log(`  ${m.id}  ${m.attributes.name}`);
  }
} else if (cmd === 'flow' && arg) {
  const { status, ok, body } = await getJson(`https://a.klaviyo.com/api/flows/${arg}/`);
  if (!ok) { console.error(`❌ ${status}`, JSON.stringify(body, null, 2)); process.exit(1); }
  console.log(JSON.stringify(body, null, 2));
} else {
  console.log('Usage: node scripts/klaviyo-inspect.mjs flows|metrics|flow <id>');
  process.exit(1);
}
