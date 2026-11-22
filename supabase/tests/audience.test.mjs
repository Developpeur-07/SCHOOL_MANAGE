import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase, queryRows, resetActor } from './helpers.mjs';

/**
 * Mesure d'audience facultative.
 *
 * La table ne contient que des compteurs agrégés. Le rôle anonyme n'a aucun
 * droit direct dessus : il ne peut que faire appel à la fonction
 * sécurisée, qui applique elle-même une liste blanche de pages publiques.
 *
 * Ces contrôles garantissent qu'une mesure ne peut ni concerner une page
 * privée, ni être lue par le navigateur, ni fausser les compteurs.
 */

const database = await createTestDatabase();
after(async () => {
  await resetActor(database);
  await database.close();
});

async function compterLignes(sql, params = []) {
  const rows = await queryRows(database, sql, params);
  return Number(rows[0].count);
}

async function fonctionCommeAnon(sql, params = []) {
  await resetActor(database);
  await database.exec('set role anon');
  try {
    return await database.query(sql, params);
  } finally {
    await resetActor(database);
  }
}

test('la table de mesure existe avec RLS actif et forcé', async () => {
  const rows = await queryRows(
    database,
    `select relrowsecurity, relforcerowsecurity
     from pg_class
     join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public' and relname = 'audience_daily'`,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].relrowsecurity, true, 'RLS inactif');
  assert.equal(rows[0].relforcerowsecurity, true, 'FORCE RLS absent');
});

test('le rôle anonyme n’a aucun droit direct sur la table', async () => {
  await assert.rejects(() =>
    fonctionCommeAnon('select * from public.audience_daily'),
  );
  await assert.rejects(() =>
    fonctionCommeAnon(
      "insert into public.audience_daily (day, path, visits) values (current_date, '/', 1)",
    ),
  );
});

test('la fonction compte une visite sur une page publique autorisée', async () => {
  await fonctionCommeAnon("select public.register_audience_visit('/')");

  const visites = await compterLignes(
    "select count(*) from public.audience_daily where path = '/' and day = (now() at time zone 'utc')::date",
  );
  assert.equal(visites, 1);
});

test('la fonction incrémente le compteur plutôt que de dupliquer', async () => {
  await fonctionCommeAnon("select public.register_audience_visit('/connexion')");
  await fonctionCommeAnon("select public.register_audience_visit('/connexion')");
  await fonctionCommeAnon("select public.register_audience_visit('/connexion')");

  const rows = await queryRows(
    database,
    "select visits from public.audience_daily where path = '/connexion'",
  );
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].visits), 3);
});

test('la fonction ignore toute page qui n’est pas listée', async () => {
  for (const chemin of [
    '/parent/11000000-0000-4000-8000-000000000001',
    '/compte',
    '/ecole',
    '/api/measure',
    '/privé',
  ]) {
    await fonctionCommeAnon('select public.register_audience_visit($1)', [chemin]);
  }

  const total = await compterLignes('select count(*) from public.audience_daily');
  const totalInitial = await compterLignes(
    "select count(*) from public.audience_daily where path in ('/', '/connexion')",
  );
  assert.equal(total, totalInitial, 'une page non autorisée a été comptabilisée');
});

test('la fonction normalise la casse et les espaces', async () => {
  await fonctionCommeAnon("select public.register_audience_visit('  /CONDITIONS  ')");

  const rows = await queryRows(
    database,
    "select path, visits from public.audience_daily where path = '/conditions'",
  );
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].visits), 1);
});

test('la fonction traite une valeur nulle comme la page d’accueil', async () => {
  await fonctionCommeAnon('select public.register_audience_visit(null)');

  const rows = await queryRows(
    database,
    "select visits from public.audience_daily where path = '/'",
  );
  assert.equal(Number(rows[0].visits), 2);
});

test('le rôle authentifié ne dispose pas non plus d’un accès direct', async () => {
  await resetActor(database);
  await database.exec('set role authenticated');
  await assert.rejects(() => database.query('select * from public.audience_daily'));
  await resetActor(database);
});

test('la table ne stocke aucune donnée personnelle', async () => {
  const colonnes = await queryRows(
    database,
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'audience_daily'
     order by column_name`,
  );

  const noms = colonnes.map((colonne) => colonne.column_name);
  assert.deepEqual(noms, ['day', 'id', 'path', 'updated_at', 'visits']);

  for (const interdit of ['ip', 'user_id', 'email', 'user_agent', 'referrer']) {
    assert.equal(noms.includes(interdit), false, `colonne inattendue : ${interdit}`);
  }
});
