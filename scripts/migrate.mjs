import { createClient } from '@libsql/client';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = createClient({ url: process.env.DATABASE_URL ?? 'file:local.db', authToken: process.env.DATABASE_AUTH_TOKEN });

await client.execute(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`);
const migrationDir = path.join(root, 'db', 'migrations');
const files = (await readdir(migrationDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const applied = await client.execute('SELECT name FROM _migrations');
const appliedNames = new Set(applied.rows.map((row) => row.name));

for (const file of files) {
  if (appliedNames.has(file)) continue;
  const sql = await readFile(path.join(migrationDir, file), 'utf8');
  const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await client.execute(statement);
  await client.execute({ sql: 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', args: [file, Date.now()] });
  console.log(`Applied ${file}`);
}
await client.close();
