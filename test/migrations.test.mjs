import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rm } from 'node:fs/promises';

const exec = promisify(execFile);
test('migrations are idempotent', async () => {
  await rm('local.db', { force: true });
  await exec(process.execPath, ['scripts/migrate.mjs']);
  await exec(process.execPath, ['scripts/migrate.mjs']);
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url: 'file:local.db' });
  const result = await client.execute('SELECT name FROM _migrations');
  assert.deepEqual(result.rows.map((row) => row.name), ['001_create_entries.sql']);
  await client.close();
});
