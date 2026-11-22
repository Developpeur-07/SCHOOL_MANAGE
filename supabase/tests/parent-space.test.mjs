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
 * Étape 5 — cinq onglets parent en lecture seule.
 *
 * Ces tests vérifient, au niveau de la base (donc au niveau de la RLS qui
 * s'applique au client Supabase authentifié utilisé par l'application), que :
 *  - un parent multi-enfants ne voit que les données de ses enfants liés ;
 *  - aucun brouillon de note ne fuite ;
 *  - les annonces et notifications sont filtrées par enfant ;
 *  - un parent ne peut rien écrire sur les données métier.
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

/** Tables lues par les cinq onglets parent. */
const TABLES_PARENT = ['grades', 'attendance', 'fees', 'payments', 'notifications'];

test('parent multi-enfants : chaque enfant lié est visible, aucun autre', async () => {
  const students = await rowsAs(ids.parentA1, 'select id from public.students order by id');
  assert.deepEqual(
    students.map((row) => row.id),
    [ids.studentA1, ids.studentA2].sort(),
  );

  // Les deux enfants sont dans la même école : aucune fuite inter-écoles.
  for (const studentId of [ids.studentA1, ids.studentA2]) {
    const [row] = await rowsAs(
      ids.parentA1,
      'select school_id from public.students where id = $1',
      [studentId],
    );
    assert.equal(row.school_id, ids.schoolA);
  }

  // L'élève de l'autre école n'est jamais visible.
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.students where id = $1', [ids.studentB1]),
    0,
  );
});

test('parent multi-enfants : les cinq onglets ne fuient pas vers un enfant non lié', async () => {
  for (const table of TABLES_PARENT) {
    assert.equal(
      await countAs(
        ids.parentA1,
        `select count(*) from public.${table} where student_id = $1`,
        [ids.studentA3],
      ),
      0,
      `${table}: fuite vers un enfant non lié`,
    );
  }
});

test('parent multi-enfants : les données des deux enfants restent distinctes', async () => {
  // Résultats : chaque enfant a ses propres notes.
  const gradeA1 = await countAs(
    ids.parentA1,
    'select count(*) from public.grades where student_id = $1',
    [ids.studentA1],
  );
  const gradeA2 = await countAs(
    ids.parentA1,
    'select count(*) from public.grades where student_id = $1',
    [ids.studentA2],
  );
  assert.ok(gradeA1 > 0, 'Les notes de l’enfant A1 doivent être visibles');
  assert.ok(gradeA2 > 0, 'Les notes de l’enfant A2 doivent être visibles');

  // Vie scolaire : les présences ne sont pas mélangées.
  const attendanceA1 = await rowsAs(
    ids.parentA1,
    'select student_id from public.attendance order by student_id',
  );
  const studentIds = new Set(attendanceA1.map((row) => row.student_id));
  assert.ok(studentIds.has(ids.studentA1));
  assert.ok(studentIds.has(ids.studentA2));
  assert.ok(!studentIds.has(ids.studentA3));

  // Paiements : les frais et les reçus sont rattachés au bon enfant.
  const fees = await rowsAs(
    ids.parentA1,
    'select student_id from public.fees where student_id = $1 or student_id = $2',
    [ids.studentA1, ids.studentA2],
  );
  assert.ok(fees.length > 0);
  for (const fee of fees) {
    assert.ok([ids.studentA1, ids.studentA2].includes(fee.student_id));
  }
});

test('parent : aucun brouillon de note n’est exposé', async () => {
  assert.equal(
    await countAs(ids.parentA3, 'select count(*) from public.grades where id = $1', [ids.draftGradeA3]),
    0,
    'Un brouillon ne doit jamais être visible par un parent',
  );
  assert.equal(
    await countAs(
      ids.parentA3,
      "select count(*) from public.grades where status <> 'published'",
    ),
    0,
  );
  // Le brouillon reste invisible même si le parent connaît son identifiant.
  const rows = await rowsAs(
    ids.parentA3,
    'select id, evaluation_label from public.grades where student_id = $1',
    [ids.studentA3],
  );
  for (const row of rows) {
    assert.notEqual(row.id, ids.draftGradeA3);
  }
});

test('parent : les annonces et notifications sont filtrées par enfant', async () => {
  // L'annonce « élève A1 » cible le premier enfant : visible par son tuteur.
  assert.equal(
    await countAs(
      ids.parentA1,
      'select count(*) from public.announcements where id = $1',
      [ids.announcementA],
    ),
    1,
  );
  // Le tuteur du second enfant ne reçoit pas l'annonce de l'autre enfant.
  const announcementsA2 = await rowsAs(
    ids.parentA2,
    'select id from public.announcements',
  );
  for (const announcement of announcementsA2) {
    assert.notEqual(announcement.id, ids.announcementA);
  }
  // Les notifications sont limitées aux enfants du destinataire.
  const notifications = await rowsAs(
    ids.parentA1,
    'select student_id from public.notifications',
  );
  assert.ok(notifications.length > 0);
  for (const notification of notifications) {
    assert.ok(
      [ids.studentA1, ids.studentA2].includes(notification.student_id),
      `Notification rattachée à un enfant non lié : ${notification.student_id}`,
    );
  }
});

test('parent : aucune écriture possible sur les données des cinq onglets', async () => {
  const forbiddenUpdates = [
    ['public.grades', 'score = 20', 'id = $1', [ids.gradeA1]],
    ['public.attendance', "status = 'present'", 'student_id = $1', [ids.studentA1]],
    ['public.fees', 'amount_minor = 1', 'id = $1', [ids.feeA1]],
    ['public.payments', 'amount_minor = 1', 'id = $1', [ids.paymentA1]],
  ];

  for (const [table, assignment, predicate, params] of forbiddenUpdates) {
    let affectedRows = null;
    let rejected = false;
    try {
      const result = await asActor(database, ids.parentA1, () =>
        database.query(`update ${table} set ${assignment} where ${predicate}`, params),
      );
      affectedRows = result.affectedRows;
    } catch (error) {
      rejected = true;
      assert.equal(error.code, '42501', `${table}: refus attendu`);
    }
    // Soit l'écriture est refusée outright, soit la RLS filtre toutes les lignes.
    assert.ok(rejected || affectedRows === 0, `${table}: un parent ne doit pas modifier une ligne`);
  }

  // Les valeurs sont inchangées en base.
  const [grade] = await queryRows(
    database,
    'select score from public.grades where id = $1',
    [ids.gradeA1],
  );
  assert.equal(Number(grade.score), 14.5);

  const [fee] = await queryRows(
    database,
    'select amount_minor from public.fees where id = $1',
    [ids.feeA1],
  );
  assert.equal(Number(fee.amount_minor), 50000);

  const [payment] = await queryRows(
    database,
    'select amount_minor from public.payments where id = $1',
    [ids.paymentA1],
  );
  assert.equal(Number(payment.amount_minor), 20000);
});

test('parent : la suppression d’une ligne métier est refusée', async () => {
  for (const table of ['grades', 'attendance', 'fees', 'payments']) {
    await asActor(database, ids.parentA1, async () => {
      await assert.rejects(
        database.query(`delete from public.${table}`),
        (error) => error.code === '42501',
        `${table}: la suppression doit être refusée`,
      );
    });
  }
});

test('parent : la révocation du lien retire immédiatement les données des onglets', async () => {
  const before = await countAs(
    ids.parentA2,
    'select count(*) from public.grades where student_id = $1',
    [ids.studentA2],
  );
  assert.ok(before > 0, 'Le second tuteur doit voir les notes avant révocation');

  await asActor(database, ids.directionA, async () => {
    await database.query('update public.guardian_links set is_active = false');
  });

  for (const table of [...TABLES_PARENT, 'students', 'announcements']) {
    assert.equal(
      await countAs(ids.parentA2, `select count(*) from public.${table}`),
      0,
      `${table}: les données doivent disparaître après révocation du lien`,
    );
  }

  // Restauration du lien pour ne pas impacter les tests suivants.
  await asActor(database, ids.directionA, async () => {
    await database.query('update public.guardian_links set is_active = true');
  });
});
