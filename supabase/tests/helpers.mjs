import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const supabaseDirectory = path.resolve(testsDirectory, '..');
const migrationsDirectory = path.join(supabaseDirectory, 'migrations');

// Supabase fournit auth.users et auth.uid(). PGlite ne les fournit pas : ce
// bootstrap minimal les remplace, sans modifier les migrations métier testées.
const supabaseAuthBootstrap = `
  create role anon nologin noinherit nobypassrls;
  create role authenticated nologin noinherit nobypassrls;

  create schema auth;
  create table auth.users (
    instance_id uuid,
    id uuid primary key,
    aud text,
    role text,
    email text unique,
    encrypted_password text,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    created_at timestamptz,
    updated_at timestamptz
  );

  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;

  grant usage on schema auth to anon, authenticated;
  revoke all on table auth.users from anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated, public;
`;

export const ids = Object.freeze({
  schoolA: '10000000-0000-4000-8000-000000000001',
  schoolB: '20000000-0000-4000-8000-000000000002',
  directionA: 'a0000000-0000-4000-8000-000000000001',
  secretaryA: 'a0000000-0000-4000-8000-000000000002',
  accountantA: 'a0000000-0000-4000-8000-000000000003',
  teacherA: 'a0000000-0000-4000-8000-000000000004',
  supervisorA: 'a0000000-0000-4000-8000-000000000005',
  parentA1: 'a0000000-0000-4000-8000-000000000010',
  parentA2: 'a0000000-0000-4000-8000-000000000011',
  parentA3: 'a0000000-0000-4000-8000-000000000012',
  parentWithoutLink: 'a0000000-0000-4000-8000-000000000013',
  directionB: 'b0000000-0000-4000-8000-000000000001',
  accountantB: 'b0000000-0000-4000-8000-000000000003',
  teacherB: 'b0000000-0000-4000-8000-000000000004',
  parentB: 'b0000000-0000-4000-8000-000000000010',
  classA1: '12000000-0000-4000-8000-000000000001',
  classA2: '12000000-0000-4000-8000-000000000002',
  classB1: '22000000-0000-4000-8000-000000000001',
  subjectA: '13000000-0000-4000-8000-000000000001',
  periodA: '14000000-0000-4000-8000-000000000001',
  studentA1: '11000000-0000-4000-8000-000000000001',
  studentA2: '11000000-0000-4000-8000-000000000002',
  studentA3: '11000000-0000-4000-8000-000000000003',
  studentB1: '21000000-0000-4000-8000-000000000001',
  guardianLinkA1: '15000000-0000-4000-8000-000000000001',
  gradeA1: '16000000-0000-4000-8000-000000000001',
  gradeA3: '16000000-0000-4000-8000-000000000003',
  draftGradeA3: '16000000-0000-4000-8000-000000000004',
  gradeB1: '26000000-0000-4000-8000-000000000001',
  feeA1: '18000000-0000-4000-8000-000000000001',
  feeA2: '18000000-0000-4000-8000-000000000002',
  feeB1: '28000000-0000-4000-8000-000000000001',
  paymentA1: '19000000-0000-4000-8000-000000000001',
  announcementA: '1a000000-0000-4000-8000-000000000002',
  announcementB: '2a000000-0000-4000-8000-000000000001',
  notificationA1: '1c000000-0000-4000-8000-000000000001',
  notificationA3: '1c000000-0000-4000-8000-000000000004',
  notificationB1: '2c000000-0000-4000-8000-000000000001',
});

export async function createTestDatabase() {
  const database = new PGlite({ extensions: { pgcrypto } });
  await database.waitReady;
  await database.exec(supabaseAuthBootstrap);

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sql = await readFile(path.join(migrationsDirectory, migrationFile), 'utf8');
    await database.exec(sql);
  }

  await database.exec(await readFile(path.join(supabaseDirectory, 'seed.sql'), 'utf8'));
  return database;
}

export async function resetActor(database) {
  await database.exec('reset role');
  await database.query(
    "select set_config('request.jwt.claim.sub', '', false)",
  );
}

export async function asActor(database, userId, callback) {
  await resetActor(database);
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [userId ?? ''],
  );
  await database.exec(`set role ${userId ? 'authenticated' : 'anon'}`);

  try {
    return await callback();
  } finally {
    await resetActor(database);
  }
}

export async function queryRows(database, sql, params = []) {
  return (await database.query(sql, params)).rows;
}

export async function queryCount(database, sql, params = []) {
  const result = await database.query(sql, params);
  return Number(result.rows[0].count);
}
