// Wipes ALL app data from the linked Supabase project: every public table,
// auth users, and every storage object. Destructive — meant for resetting a
// dev/personal project to a clean slate.
//
//   npm run db:clear         # prompts for confirmation
//   npm run db:clear -- -y   # skip the prompt (CI / scripted)
//
// Auth: uses SUPABASE_ACCESS_TOKEN if set, else the token from the Supabase CLI
// login (macOS keychain). Project ref: SUPABASE_PROJECT_REF or supabase/.temp.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const REF =
  process.env.SUPABASE_PROJECT_REF ||
  readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim();

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    return execSync('security find-generic-password -s "Supabase CLI" -w', {
      encoding: 'utf8',
    }).trim();
  } catch {
    throw new Error(
      'No SUPABASE_ACCESS_TOKEN set and could not read the Supabase CLI token. ' +
        'Run `npx supabase login` or export SUPABASE_ACCESS_TOKEN.',
    );
  }
}

const TOKEN = accessToken();
const API = `https://api.supabase.com/v1/projects/${REF}`;

async function query(sql) {
  const r = await fetch(`${API}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`query failed (${r.status}): ${await r.text()}`);
  return r.json();
}

async function confirm() {
  if (process.argv.includes('-y') || process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) =>
    rl.question(
      `\n⚠️  This ERASES all data, auth users, and storage on project "${REF}".\n   Type "clear" to proceed: `,
      res,
    ),
  );
  rl.close();
  return answer.trim().toLowerCase() === 'clear';
}

async function main() {
  if (!(await confirm())) {
    console.log('Aborted — nothing was changed.');
    process.exit(1);
  }

  // 1. Truncate every public table (auto-discovered, so new tables are covered).
  const [{ agg: tables }] = await query(
    "select string_agg('public.' || quote_ident(table_name), ', ') as agg " +
      "from information_schema.tables " +
      "where table_schema = 'public' and table_type = 'BASE TABLE'",
  );
  if (tables) {
    await query(`truncate table ${tables} restart identity cascade;`);
    console.log('✓ Truncated public tables');
  }
  await query('delete from auth.users;');
  console.log('✓ Deleted auth users');

  // 2. Empty every storage bucket (removes the files, not just the rows).
  const buckets = await query('select id from storage.buckets');
  if (buckets.length) {
    const keys = await fetch(`${API}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }).then((r) => r.json());
    const serviceRole = keys.find((k) => k.name === 'service_role')?.api_key;
    for (const { id } of buckets) {
      const [{ j: names }] = await query(
        `select coalesce(jsonb_agg(name), '[]'::jsonb) as j from storage.objects where bucket_id = '${id}'`,
      );
      if (names.length && serviceRole) {
        await fetch(`https://${REF}.supabase.co/storage/v1/object/${id}`, {
          method: 'DELETE',
          headers: {
            apikey: serviceRole,
            Authorization: `Bearer ${serviceRole}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: names }),
        });
      }
      console.log(`✓ Emptied bucket "${id}" (${names.length} object(s))`);
    }
  }

  console.log('\n✅ Database + storage cleared.');
}

main().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
