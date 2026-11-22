import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import {
  asActor,
  createTestDatabase,
  ids,
  queryCount,
  queryRows,
  resetActor,
} from './helpers.mjs';

/**
 * Étape 6 — supervision globale du management.
 *
 * Ces tests vérifient, au niveau de la base (donc au niveau de la RLS qui
 * s'applique au client Supabase authentifié utilisé par l'application), que :
 *  - le rôle de supervision globale n'appartient à aucune école ;
 *  - il lit l'ensemble des écoles, y compris les brouillons et les liens
 *    tuteurs que les autres rôles ne voient jamais ;
 *  - il ne peut rien écrire : la supervision est strictement consultative ;
 *  - l'isolation des autres rôles est inchangée (une école ne voit que la
 *    sienne, un parent que ses enfants liés) ;
 *  - la désactivation du profil de supervision coupe immédiatement l'accès.
 */

const database = await createTestDatabase();
after(async () => {
  await resetActor(database);
  await database.close();
});

async function countAs(userId, sql, params = []) {
  return asActor(database, userId, () => queryCount(database, sql, params));
}

async function rowsAs(userId, sql, params = []) {
  return asActor(database, userId, () => queryRows(database, sql, params));
}

async function assertWriteRejected(userId, sql, params = []) {
  await asActor(database, userId, async () => {
    await assert.rejects(database.query(sql, params));
  });
}

test('le profil de supervision globale n’appartient à aucune école', async () => {
  const [profile] = await queryRows(
    database,
    'select role, school_id, is_active from public.profiles where id = $1',
    [ids.superAdmin],
  );

  assert.equal(profile.role, 'super_admin');
  assert.equal(profile.school_id, null);
  assert.equal(profile.is_active, true);

  // La biconditionnalité est garantie par la base : un profil de supervision
  // globale ne peut pas être rattaché à une école...
  await assert.rejects(
    database.query(
      `insert into public.profiles (id, school_id, role, full_name)
       values ($1, $2, 'super_admin', 'Supervision rattachée')`,
      ['d0000000-0000-4000-8000-000000000002', ids.schoolA],
    ),
    'Un rôle de supervision globale ne doit pas pouvoir être rattaché à une école',
  );

  // ... et un profil sans école ne peut être qu'un rôle de supervision.
  await assert.rejects(
    database.query(
      `insert into public.profiles (id, school_id, role, full_name)
       values ($1, null, 'parent', 'Parent sans école')`,
      ['d0000000-0000-4000-8000-000000000001'],
    ),
    'Un rôle d\'école ne doit pas pouvoir être créé sans école',
  );

  // La biconditionnalité vaut aussi en modification : un profil de
  // supervision globale ne peut pas être rattaché à une école après coup.
  await assert.rejects(
    database.query(
      'update public.profiles set school_id = $1 where id = $2',
      [ids.schoolA, ids.superAdmin],
    ),
    'Le rattachement d\'un profil de supervision globale doit être refusé',
  );
});

test('la supervision lit toutes les écoles et toutes leurs données', async () => {
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.schools'), 2);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.students'), 4);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.classes'), 3);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.guardian_links'), 5);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.grades'), 5);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.attendance'), 4);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.fees'), 4);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.payments'), 3);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.announcements'), 6);
  assert.equal(await countAs(ids.superAdmin, 'select count(*) from public.notifications'), 12);

  // Les profils de toutes les écoles, plus celui de supervision globale.
  const profiles = await rowsAs(ids.superAdmin, 'select id from public.profiles');
  assert.equal(profiles.length, 14, 'La supervision doit lire tous les profils');
});

test('la supervision voit les brouillons et les liens que les autres rôles ignorent', async () => {
  assert.equal(
    await countAs(ids.superAdmin, `select count(*) from public.grades where status = 'draft'`),
    1,
  );
  assert.equal(
    await countAs(ids.superAdmin, 'select count(*) from public.grades where id = $1', [
      ids.draftGradeA3,
    ]),
    1,
  );

  // Le parent ne voit ni le brouillon ni les liens des autres tuteurs.
  assert.equal(
    await countAs(ids.parentA1, `select count(*) from public.grades where status = 'draft'`),
    0,
  );
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.guardian_links'),
    2,
  );
});

test('la supervision ne peut rien écrire sur les données métier', async () => {
  await assertWriteRejected(
    ids.superAdmin,
    `insert into public.classes (school_id, school_year, name)
     values ($1, '2026-2027', 'Classe interdite')`,
    [ids.schoolA],
  );
  await assertWriteRejected(
    ids.superAdmin,
    `insert into public.grades (
       school_id, student_id, subject_id, period_id, evaluation_label,
       score, max_score, status, graded_by
     ) values ($1, $2, $3, $4, 'Note interdite', 10, 20, 'draft', $5)`,
    [ids.schoolA, ids.studentA1, ids.subjectA, ids.periodA, ids.superAdmin],
  );
  await assertWriteRejected(
    ids.superAdmin,
    `insert into public.fees (school_id, student_id, label, amount_minor, due_on, created_by)
     values ($1, $2, 'Frais interdit', 1000, '2026-11-01', $3)`,
    [ids.schoolA, ids.studentA1, ids.superAdmin],
  );
  // Une mise à jour d'une ligne visible se fait sans erreur mais sans effet :
  // la politique de mise à jour ne s'applique pas à la supervision.
  const updateResult = await asActor(database, ids.superAdmin, () => database.query(
    `update public.students set first_name = 'Modifié' where id = $1`,
    [ids.studentA1],
  ));
  assert.equal(updateResult.affectedRows, 0);

  await assertWriteRejected(
    ids.superAdmin,
    'delete from public.notifications where id = $1',
    [ids.notificationA1],
  );

  // Aucune écriture n'a été appliquée.
  assert.equal(
    await countAs(ids.superAdmin, 'select count(*) from public.classes'),
    3,
  );
});

test('l’isolation des autres rôles reste inchangée', async () => {
  // La direction de l’école A ne voit pas l’école B.
  assert.equal(
    await countAs(ids.directionA, 'select count(*) from public.schools'),
    1,
  );
  assert.equal(
    await countAs(ids.directionA, 'select count(*) from public.students where school_id = $1', [
      ids.schoolB,
    ]),
    0,
  );

  // Le parent ne voit que ses enfants liés et sa propre école.
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.students'),
    2,
  );
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.schools'),
    1,
  );
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.schools where id = $1', [
      ids.schoolB,
    ]),
    0,
  );
});

test('seul le rôle de supervision active est reconnu comme super-admin', async () => {
  const [supervision] = await rowsAs(
    ids.superAdmin,
    'select public.is_super_admin() as est_super_admin',
  );
  assert.equal(supervision.est_super_admin, true);

  for (const actor of [ids.parentA1, ids.directionA, ids.teacherA, ids.accountantA]) {
    const [row] = await rowsAs(
      actor,
      'select public.is_super_admin() as est_super_admin',
    );
    assert.equal(row.est_super_admin, false);
  }
});

test('la désactivation du profil de supervision coupe tous les accès', async () => {
  await database.query(
    'update public.profiles set is_active = false where id = $1',
    [ids.superAdmin],
  );

  try {
    const tables = [
      'schools',
      'profiles',
      'students',
      'guardian_links',
      'classes',
      'grades',
      'attendance',
      'fees',
      'payments',
      'announcements',
      'notifications',
    ];

    for (const table of tables) {
      const total = await countAs(
        ids.superAdmin,
        `select count(*) from public.${table}`,
      );
      const attendu = table === 'profiles' ? 1 : 0;
      assert.equal(
        total,
        attendu,
        `${table}: un profil de supervision inactif conserve un accès indu`,
      );
    }
  } finally {
    await resetActor(database);
    await database.query(
      'update public.profiles set is_active = true where id = $1',
      [ids.superAdmin],
    );
  }
});
