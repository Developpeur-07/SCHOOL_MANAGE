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

test('les 15 tables métier ont ENABLE RLS et FORCE RLS', async () => {
  const expectedTables = [
    'schools', 'profiles', 'students', 'guardian_links', 'classes', 'subjects',
    'periods', 'grades', 'attendance', 'fees', 'payments', 'announcements',
    'announcement_targets', 'notifications', 'audit_log',
  ];
  const rows = await queryRows(
    database,
    `select table_name, row_security, force_row_security
     from (
       select
         pg_class.relname as table_name,
         pg_class.relrowsecurity as row_security,
         pg_class.relforcerowsecurity as force_row_security
       from pg_class
       join pg_namespace on pg_namespace.oid = pg_class.relnamespace
       where pg_namespace.nspname = 'public'
         and pg_class.relkind = 'r'
     ) as tables
     where table_name = any($1::text[])
     order by table_name`,
    [expectedTables],
  );

  assert.equal(rows.length, 15);
  assert.deepEqual(rows.map((row) => row.table_name).sort(), expectedTables.sort());
  for (const row of rows) {
    assert.equal(row.row_security, true, `${row.table_name}: RLS inactive`);
    assert.equal(row.force_row_security, true, `${row.table_name}: FORCE RLS absent`);
  }
});

test('le rôle interne ne peut ni se connecter ni contourner RLS', async () => {
  const [role] = await queryRows(
    database,
    `select rolcanlogin, rolinherit, rolbypassrls
     from pg_roles where rolname = 'school_manage_internal'`,
  );
  assert.deepEqual(role, {
    rolcanlogin: false,
    rolinherit: false,
    rolbypassrls: false,
  });

  const permanentMemberships = await queryRows(
    database,
    `select membership.inherit_option, membership.set_option
     from pg_auth_members as membership
     join pg_roles as owned_role on owned_role.oid = membership.roleid
     join pg_roles as member_role on member_role.oid = membership.member
     where owned_role.rolname = 'school_manage_internal'
       and member_role.rolname = 'postgres'`,
  );
  // Supabase peut conserver une ligne d’administration émise par
  // supabase_admin. Elle ne doit jamais permettre INHERIT ou SET ROLE.
  for (const membership of permanentMemberships) {
    assert.equal(membership.inherit_option, false);
    assert.equal(membership.set_option, false);
  }

  const [schema] = await queryRows(
    database,
    `select nspacl::text as access_list
     from pg_namespace where nspname = 'public'`,
  );
  assert.match(schema.access_list, /school_manage_internal=U\//);
  assert.doesNotMatch(schema.access_list, /school_manage_internal=[^,}]*C/);

  const [authSchema] = await queryRows(
    database,
    `select nspacl::text as access_list
     from pg_namespace where nspname = 'auth'`,
  );
  assert.doesNotMatch(authSchema.access_list, /school_manage_internal=/);

  const tableGrants = await queryRows(
    database,
    `select table_name, privilege_type
     from information_schema.table_privileges
     where table_schema = 'public' and grantee = 'school_manage_internal'
     order by table_name, privilege_type`,
  );
  assert.deepEqual(tableGrants, [
    { table_name: 'audit_log', privilege_type: 'INSERT' },
    { table_name: 'profiles', privilege_type: 'SELECT' },
  ]);

  const functions = await queryRows(
    database,
    `select proname, prosecdef, proconfig
     from pg_proc
     join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and proname in ('is_school_member', 'has_school_role', 'audit_business_change')`,
  );
  assert.equal(functions.length, 3);
  for (const fn of functions) {
    assert.equal(fn.prosecdef, true);
    assert.ok(fn.proconfig.includes('row_security=on'));
    assert.ok(fn.proconfig.some((setting) => setting.startsWith('search_path=')));
  }
});

test('aucun accès anonyme aux tables métier', async () => {
  assert.equal(
    await queryCount(
      database,
      `select count(*) from information_schema.table_privileges
       where table_schema = 'public' and grantee = 'anon'`,
    ),
    0,
  );
  await asActor(database, null, async () => {
    await assert.rejects(
      database.query('select count(*) from public.students'),
      (error) => error.code === '42501',
    );
  });
});

test('un parent à deux enfants ne lit que ces deux élèves', async () => {
  const students = await rowsAs(
    ids.parentA1,
    'select id from public.students order by id',
  );
  assert.deepEqual(
    students.map((row) => row.id).sort(),
    [ids.studentA1, ids.studentA2].sort(),
  );

  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.students where id = $1', [ids.studentA3]),
    0,
    'Un parent ne doit pas lire l’élève d’un autre parent',
  );
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.students where id = $1', [ids.studentB1]),
    0,
    'Un parent ne doit pas lire l’élève d’une autre école',
  );
});

test('un second tuteur autorisé lit le même enfant, sans lire les frères et sœurs non liés', async () => {
  assert.equal(
    await countAs(ids.parentA2, 'select count(*) from public.students where id = $1', [ids.studentA2]),
    1,
  );
  assert.equal(
    await countAs(ids.parentA2, 'select count(*) from public.students where id = $1', [ids.studentA1]),
    0,
  );
});

test('un parent sans lien actif ne voit aucun élève ni notification', async () => {
  assert.equal(await countAs(ids.parentWithoutLink, 'select count(*) from public.students'), 0);
  assert.equal(await countAs(ids.parentWithoutLink, 'select count(*) from public.notifications'), 0);
  assert.equal(await countAs(ids.parentWithoutLink, 'select count(*) from public.announcements'), 0);
});

test('un parent ne voit pas les liens tuteurs des autres parents', async () => {
  assert.equal(await countAs(ids.parentA1, 'select count(*) from public.guardian_links'), 2);
  assert.equal(
    await countAs(
      ids.parentA1,
      'select count(*) from public.guardian_links where guardian_id = $1',
      [ids.parentA2],
    ),
    0,
  );
});

test('un parent ne lit ni notes, présences, frais, paiements ni notifications d’un autre enfant', async () => {
  const tables = ['grades', 'attendance', 'fees', 'payments', 'notifications'];
  for (const table of tables) {
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

test('un parent voit les notes publiées de son enfant mais pas son brouillon', async () => {
  assert.equal(
    await countAs(ids.parentA3, 'select count(*) from public.grades where student_id = $1', [ids.studentA3]),
    1,
  );
  assert.equal(
    await countAs(ids.parentA3, 'select count(*) from public.grades where id = $1', [ids.draftGradeA3]),
    0,
  );
});

test('une annonce ciblée sur un élève reste invisible aux autres parents', async () => {
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.announcements where id = $1', [ids.announcementA]),
    1,
  );
  assert.equal(
    await countAs(ids.parentA3, 'select count(*) from public.announcements where id = $1', [ids.announcementA]),
    0,
  );
});

test('un parent ne peut ni modifier son rôle ni écrire les données métier', async () => {
  await assertWriteRejected(
    ids.parentA1,
    `update public.profiles set role = 'direction' where id = $1`,
    [ids.parentA1],
  );
  await assertWriteRejected(
    ids.parentA1,
    `insert into public.students (
      school_id, class_id, student_code, first_name, last_name
    ) values ($1, $2, 'ELEVE-INTERDIT', 'Intrusion', 'Fictive')`,
    [ids.schoolA, ids.classA1],
  );
  const forbiddenGradeUpdate = await asActor(database, ids.parentA1, () => database.query(
    'update public.grades set score = 20 where id = $1',
    [ids.gradeA1],
  ));
  assert.equal(forbiddenGradeUpdate.affectedRows, 0);
  const [unchangedGrade] = await queryRows(
    database,
    'select score from public.grades where id = $1',
    [ids.gradeA1],
  );
  assert.equal(Number(unchangedGrade.score), 14.5);
  await assertWriteRejected(
    ids.parentA1,
    `insert into public.payments (
      school_id, fee_id, student_id, amount_minor, payment_method, received_by
    ) values ($1, $2, $3, 1000, 'cash', $4)`,
    [ids.schoolA, ids.feeA1, ids.studentA1, ids.parentA1],
  );
});

test('une école ne voit pas les écoles, élèves, notes ou paiements d’une autre', async () => {
  const schools = await rowsAs(ids.directionA, 'select id from public.schools');
  assert.deepEqual(schools, [{ id: ids.schoolA }]);

  const schoolScopedTables = [
    'students', 'grades', 'attendance', 'fees', 'payments', 'announcements', 'notifications',
  ];
  for (const table of schoolScopedTables) {
    assert.equal(
      await countAs(ids.directionA, `select count(*) from public.${table} where school_id = $1`, [ids.schoolB]),
      0,
      `${table}: fuite vers l’école B`,
    );
  }

  assert.equal(
    await countAs(ids.directionB, 'select count(*) from public.students where school_id = $1', [ids.schoolA]),
    0,
  );
});

test('une école ne peut pas modifier une ligne ou créer une classe dans une autre école', async () => {
  const result = await asActor(database, ids.directionA, () => database.query(
    'update public.students set first_name = $1 where id = $2',
    ['Modification interdite', ids.studentB1],
  ));
  assert.equal(result.affectedRows, 0);

  await assertWriteRejected(
    ids.directionA,
    `insert into public.classes (school_id, school_year, name)
     values ($1, '2026-2027', 'Classe interdite')`,
    [ids.schoolB],
  );
  await assertWriteRejected(
    ids.teacherA,
    `insert into public.grades (
      school_id, student_id, subject_id, period_id, evaluation_label,
      score, max_score, graded_by
    ) values ($1, $2, $3, $4, 'Note inter-écoles', 10, 20, $5)`,
    [
      ids.schoolB,
      ids.studentB1,
      '23000000-0000-4000-8000-000000000001',
      '24000000-0000-4000-8000-000000000001',
      ids.teacherA,
    ],
  );
});

test('les clés étrangères composites refusent un élève B rattaché artificiellement à l’école A', async () => {
  await asActor(database, ids.directionA, async () => {
    await assert.rejects(
      database.query(
        `insert into public.grades (
          school_id, student_id, subject_id, period_id, evaluation_label,
          score, max_score, graded_by
        ) values ($1, $2, $3, $4, 'Lien inter-écoles', 10, 20, $5)`,
        [ids.schoolA, ids.studentB1, ids.subjectA, ids.periodA, ids.directionA],
      ),
      (error) => error.code === '23503',
    );
  });
});

test('school_id ne peut pas être déplacé vers une autre école', async () => {
  await assertWriteRejected(
    ids.directionA,
    'update public.students set school_id = $1 where id = $2',
    [ids.schoolB, ids.studentA1],
  );
  const [student] = await queryRows(
    database,
    'select school_id from public.students where id = $1',
    [ids.studentA1],
  );
  assert.equal(student.school_id, ids.schoolA);
});

test('la matrice de rôles interdit les lectures comptables/pédagogiques non autorisées', async () => {
  assert.equal(await countAs(ids.accountantA, 'select count(*) from public.grades'), 0);
  assert.equal(await countAs(ids.accountantA, 'select count(*) from public.attendance'), 0);
  assert.equal(await countAs(ids.teacherA, 'select count(*) from public.payments'), 0);
  assert.equal(await countAs(ids.teacherA, 'select count(*) from public.fees'), 0);
  assert.equal(await countAs(ids.supervisorA, 'select count(*) from public.grades'), 0);
  assert.equal(await countAs(ids.supervisorA, 'select count(*) from public.payments'), 0);
  assert.equal(await countAs(ids.teacherA, 'select count(*) from public.attendance'), 3);
  assert.equal(await countAs(ids.accountantA, 'select count(*) from public.payments'), 2);
});

test('un enseignant ne peut pas encaisser et un comptable ne peut pas saisir une note', async () => {
  await assertWriteRejected(
    ids.teacherA,
    `insert into public.payments (
      school_id, fee_id, student_id, amount_minor, payment_method, received_by
    ) values ($1, $2, $3, 1000, 'cash', $4)`,
    [ids.schoolA, ids.feeA1, ids.studentA1, ids.teacherA],
  );
  await assertWriteRejected(
    ids.accountantA,
    `insert into public.grades (
      school_id, student_id, subject_id, period_id, evaluation_label,
      score, max_score, graded_by
    ) values ($1, $2, $3, $4, 'Note comptable interdite', 10, 20, $5)`,
    [ids.schoolA, ids.studentA1, ids.subjectA, ids.periodA, ids.accountantA],
  );
});

test('la révocation d’un lien retire immédiatement les lectures, puis sa restauration les rétablit', async () => {
  const revoked = await asActor(database, ids.secretaryA, () => database.query(
    'update public.guardian_links set is_active = false where id = $1',
    [ids.guardianLinkA1],
  ));
  assert.equal(revoked.affectedRows, 1);

  assert.equal(await countAs(ids.parentA1, 'select count(*) from public.students'), 1);
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.students where id = $1', [ids.studentA1]),
    0,
  );
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.notifications where student_id = $1', [ids.studentA1]),
    0,
  );
  assert.equal(
    await countAs(ids.parentA1, 'select count(*) from public.announcements where id = $1', [ids.announcementA]),
    0,
  );

  const restored = await asActor(database, ids.secretaryA, () => database.query(
    'update public.guardian_links set is_active = true where id = $1',
    [ids.guardianLinkA1],
  ));
  assert.equal(restored.affectedRows, 1);
  assert.equal(await countAs(ids.parentA1, 'select count(*) from public.students'), 2);
});

test('la désactivation du profil parent coupe tous les accès malgré les liens actifs', async () => {
  await database.query(
    'update public.profiles set is_active = false where id = $1',
    [ids.parentA1],
  );

  try {
    const tables = [
      'students', 'guardian_links', 'grades', 'attendance', 'fees',
      'payments', 'announcements', 'notifications',
    ];
    for (const table of tables) {
      assert.equal(
        await countAs(ids.parentA1, `select count(*) from public.${table}`),
        0,
        `${table}: un profil parent inactif conserve un accès indu`,
      );
    }
    // Le profil propre reste lisible pour permettre d’afficher un compte désactivé.
    assert.equal(await countAs(ids.parentA1, 'select count(*) from public.profiles'), 1);
  } finally {
    await resetActor(database);
    await database.query(
      'update public.profiles set is_active = true where id = $1',
      [ids.parentA1],
    );
  }
});

test('une présence ne peut pas utiliser une autre classe que la classe courante de l’élève', async () => {
  await asActor(database, ids.supervisorA, async () => {
    await assert.rejects(
      database.query(
        `insert into public.attendance (
          school_id, student_id, class_id, attendance_date, status, recorded_by
        ) values ($1, $2, $3, '2026-11-07', 'present', $4)`,
        [ids.schoolA, ids.studentA1, ids.classA2, ids.supervisorA],
      ),
      (error) => error.code === '23514',
    );
  });
});

test('l’identité des notes, présences et liens ne peut pas être substituée', async () => {
  await assertWriteRejected(
    ids.teacherA,
    'update public.grades set student_id = $1 where id = $2',
    [ids.studentA2, ids.gradeA1],
  );
  await assertWriteRejected(
    ids.supervisorA,
    'update public.attendance set attendance_date = $1 where id = $2',
    ['2026-11-07', '17000000-0000-4000-8000-000000000001'],
  );
  await assertWriteRejected(
    ids.secretaryA,
    'update public.guardian_links set guardian_id = $1 where id = $2',
    [ids.parentA2, ids.guardianLinkA1],
  );
});

test('une ancienne présence reste corrigeable après le changement de classe courante', async () => {
  const attendanceId = '17000000-0000-4000-8000-000000000001';
  await database.query(
    'update public.students set class_id = $1 where id = $2',
    [ids.classA2, ids.studentA1],
  );

  try {
    const corrected = await asActor(database, ids.supervisorA, () => database.query(
      'update public.attendance set comment = $1 where id = $2',
      ['Correction fictive après changement de classe', attendanceId],
    ));
    assert.equal(corrected.affectedRows, 1);
    const [attendance] = await queryRows(
      database,
      'select class_id from public.attendance where id = $1',
      [attendanceId],
    );
    assert.equal(attendance.class_id, ids.classA1);
  } finally {
    await resetActor(database);
    await database.query(
      'update public.students set class_id = $1 where id = $2',
      [ids.classA1, ids.studentA1],
    );
  }
});

test('un parent marque seulement ses notifications comme lues', async () => {
  const own = await asActor(database, ids.parentA1, () => database.query(
    'update public.notifications set read_at = now() where id = $1',
    [ids.notificationA1],
  ));
  assert.equal(own.affectedRows, 1);

  const other = await asActor(database, ids.parentA1, () => database.query(
    'update public.notifications set read_at = now() where id = $1',
    [ids.notificationA3],
  ));
  assert.equal(other.affectedRows, 0);

  await assertWriteRejected(
    ids.parentA1,
    'update public.notifications set recipient_id = $1 where id = $2',
    [ids.parentA3, ids.notificationA1],
  );

  await asActor(database, ids.parentA1, () => database.query(
    'update public.notifications set read_at = null where id = $1',
    [ids.notificationA1],
  ));
});

test('un paiement valide produit un reçu et un audit à nom du comptable', async () => {
  const paymentId = '19000000-0000-4000-8000-000000000101';
  await asActor(database, ids.accountantA, () => database.query(
    `insert into public.payments (
      id, school_id, fee_id, student_id, amount_minor,
      payment_method, receipt_number, received_by
    ) values ($1, $2, $3, $4, 1000, 'cash', 'REC-TEST-VALID', $5)`,
    [paymentId, ids.schoolA, ids.feeA1, ids.studentA1, ids.accountantA],
  ));

  const [payment] = await rowsAs(
    ids.parentA1,
    'select receipt_number, amount_minor from public.payments where id = $1',
    [paymentId],
  );
  assert.deepEqual(payment, { receipt_number: 'REC-TEST-VALID', amount_minor: 1000 });

  const [audit] = await rowsAs(
    ids.directionA,
    `select actor_id, school_id, action, changed_fields, transaction_id
     from public.audit_log
     where entity_table = 'payments' and entity_id = $1`,
    [paymentId],
  );
  assert.equal(audit.actor_id, ids.accountantA);
  assert.equal(audit.school_id, ids.schoolA);
  assert.equal(audit.action, 'insert');
  assert.ok(Number(audit.transaction_id) > 0);
  assert.ok(audit.changed_fields.includes('amount_minor'));
  assert.equal(await countAs(ids.parentA3, 'select count(*) from public.payments where id = $1', [paymentId]), 0);
});

test('les paiements refusent le surpaiement et un élève qui ne correspond pas au frais', async () => {
  await asActor(database, ids.accountantA, async () => {
    await assert.rejects(
      database.query(
        `insert into public.payments (
          school_id, fee_id, student_id, amount_minor, payment_method, received_by
        ) values ($1, $2, $3, 1, 'cash', $4)`,
        [ids.schoolA, ids.feeA2, ids.studentA2, ids.accountantA],
      ),
      (error) => error.code === '23514',
    );
    await assert.rejects(
      database.query(
        `insert into public.payments (
          school_id, fee_id, student_id, amount_minor, payment_method, received_by
        ) values ($1, $2, $3, 100, 'cash', $4)`,
        [ids.schoolA, ids.feeA1, ids.studentA2, ids.accountantA],
      ),
      (error) => error.code === '23514',
    );
  });
});

test('un frais ne peut pas descendre sous le total déjà encaissé', async () => {
  await asActor(database, ids.accountantA, async () => {
    await assert.rejects(
      database.query('update public.fees set amount_minor = 1000 where id = $1', [ids.feeA1]),
      (error) => error.code === '23514',
    );
  });
});

test('une note créée et corrigée est auditée, sans usurpation de l’auteur initial', async () => {
  const gradeId = '16000000-0000-4000-8000-000000000101';
  await asActor(database, ids.teacherA, () => database.query(
    `insert into public.grades (
      id, school_id, student_id, subject_id, period_id, evaluation_label,
      score, max_score, status, graded_by
    ) values ($1, $2, $3, $4, $5, 'Note fictive audit', 10, 20, 'published', $6)`,
    [gradeId, ids.schoolA, ids.studentA1, ids.subjectA, ids.periodA, ids.teacherA],
  ));
  await asActor(database, ids.teacherA, () => database.query(
    'update public.grades set score = 11 where id = $1',
    [gradeId],
  ));
  await assertWriteRejected(
    ids.teacherA,
    'update public.grades set graded_by = $1 where id = $2',
    [ids.directionA, gradeId],
  );

  const audits = await rowsAs(
    ids.directionA,
    `select action, actor_id, changed_fields from public.audit_log
     where entity_table = 'grades' and entity_id = $1 order by created_at`,
    [gradeId],
  );
  assert.equal(audits.length, 2);
  assert.deepEqual(audits.map((audit) => audit.action), ['insert', 'update']);
  assert.ok(audits.every((audit) => audit.actor_id === ids.teacherA));
  assert.ok(audits[1].changed_fields.includes('score'));
  assert.ok(audits[1].changed_fields.includes('updated_at'));
});

test('une annonce exige une cible avant publication puis devient immutable', async () => {
  const announcementId = '1a000000-0000-4000-8000-000000000101';
  const targetId = '1b000000-0000-4000-8000-000000000101';
  const notificationId = '1c000000-0000-4000-8000-000000000101';

  await asActor(database, ids.secretaryA, () => database.query(
    `insert into public.announcements (id, school_id, title, body, created_by)
     values ($1, $2, 'Annonce fictive de workflow', 'Contenu fictif', $3)`,
    [announcementId, ids.schoolA, ids.secretaryA],
  ));

  await asActor(database, ids.secretaryA, async () => {
    await assert.rejects(
      database.query('update public.announcements set status = $1 where id = $2', ['published', announcementId]),
      (error) => error.code === '23514',
    );
  });

  await asActor(database, ids.secretaryA, () => database.query(
    `insert into public.announcement_targets (
      id, school_id, announcement_id, target_type, student_id
    ) values ($1, $2, $3, 'student', $4)`,
    [targetId, ids.schoolA, announcementId, ids.studentA1],
  ));
  const published = await asActor(database, ids.secretaryA, () => database.query(
    'update public.announcements set status = $1 where id = $2',
    ['published', announcementId],
  ));
  assert.equal(published.affectedRows, 1);

  const [announcement] = await queryRows(
    database,
    'select published_by, published_at from public.announcements where id = $1',
    [announcementId],
  );
  assert.equal(announcement.published_by, ids.secretaryA);
  assert.ok(announcement.published_at);

  await assertWriteRejected(
    ids.secretaryA,
    'update public.announcements set title = $1 where id = $2',
    ['Modification interdite', announcementId],
  );
  const forbiddenTargetDelete = await asActor(database, ids.secretaryA, () => database.query(
    'delete from public.announcement_targets where id = $1',
    [targetId],
  ));
  assert.equal(forbiddenTargetDelete.affectedRows, 0);
  assert.equal(await queryCount(database, 'select count(*) from public.announcement_targets where id = $1', [targetId]), 1);

  // La diffusion automatique appartient aux étapes 6/7. Cette ligne manuelle
  // vérifie uniquement la politique de lecture d’une notification matérialisée.
  assert.equal(await countAs(ids.parentA1, 'select count(*) from public.announcements where id = $1', [announcementId]), 0);
  await database.query(
    `insert into public.notifications (
      id, school_id, recipient_id, student_id, announcement_id,
      event_type, source_id, title, body
    ) values ($1, $2, $3, $4, $5, 'announcement_published', $5, 'Test fictif', 'Notification fictive')`,
    [notificationId, ids.schoolA, ids.parentA1, ids.studentA1, announcementId],
  );
  assert.equal(await countAs(ids.parentA1, 'select count(*) from public.announcements where id = $1', [announcementId]), 1);
  assert.equal(await countAs(ids.parentA3, 'select count(*) from public.announcements where id = $1', [announcementId]), 0);
});

test('le rôle interne ne lit que le profil de l’utilisateur courant', async () => {
  await resetActor(database);
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [ids.parentA1],
  );
  await database.exec('set role school_manage_internal');

  try {
    assert.equal(await queryCount(database, 'select count(*) from public.profiles'), 1);
    assert.equal(
      await queryCount(database, 'select count(*) from public.profiles where id = $1', [ids.parentA1]),
      1,
    );
    assert.equal(
      await queryCount(database, 'select count(*) from public.profiles where id = $1', [ids.parentA2]),
      0,
    );
  } finally {
    await resetActor(database);
  }
});

test('les privilèges de colonnes bloquent directement les champs techniques et d’identité', async () => {
  const cases = [
    {
      actor: ids.teacherA,
      sql: 'update public.grades set graded_by = $1 where id = $2',
      params: [ids.directionA, ids.gradeA1],
    },
    {
      actor: ids.teacherA,
      sql: 'update public.grades set published_at = now() where id = $1',
      params: [ids.gradeA1],
    },
    {
      actor: ids.secretaryA,
      sql: 'update public.announcements set published_by = $1 where id = $2',
      params: [ids.secretaryA, ids.announcementA],
    },
    {
      actor: ids.accountantA,
      sql: 'update public.fees set created_by = $1 where id = $2',
      params: [ids.directionA, ids.feeA1],
    },
    {
      actor: ids.supervisorA,
      sql: 'update public.attendance set student_id = $1 where id = $2',
      params: [ids.studentA2, '17000000-0000-4000-8000-000000000001'],
    },
  ];

  for (const testCase of cases) {
    await asActor(database, testCase.actor, async () => {
      await assert.rejects(
        database.query(testCase.sql, testCase.params),
        (error) => error.code === '42501',
      );
    });
  }
});

test('un UPDATE sans changement ne modifie ni updated_at ni audit_log', async () => {
  const [before] = await queryRows(
    database,
    `select grades.updated_at,
      (select count(*) from public.audit_log
       where entity_table = 'grades' and entity_id = grades.id) as audit_count
     from public.grades where id = $1`,
    [ids.gradeA1],
  );

  const result = await asActor(database, ids.teacherA, () => database.query(
    'update public.grades set score = score where id = $1',
    [ids.gradeA1],
  ));
  assert.equal(result.affectedRows, 1);

  const [afterUpdate] = await queryRows(
    database,
    `select grades.updated_at,
      (select count(*) from public.audit_log
       where entity_table = 'grades' and entity_id = grades.id) as audit_count
     from public.grades where id = $1`,
    [ids.gradeA1],
  );
  assert.equal(afterUpdate.updated_at.toISOString(), before.updated_at.toISOString());
  assert.equal(afterUpdate.audit_count, before.audit_count);
});

test('audit_log est limité à la direction du tenant et append-only pour les utilisateurs', async () => {
  assert.equal(
    await countAs(ids.directionA, 'select count(*) from public.audit_log where school_id = $1', [ids.schoolB]),
    0,
  );
  assert.equal(await countAs(ids.parentA1, 'select count(*) from public.audit_log'), 0);
  assert.equal(await countAs(ids.accountantA, 'select count(*) from public.audit_log'), 0);

  const [audit] = await queryRows(database, 'select id from public.audit_log limit 1');
  await assertWriteRejected(
    ids.directionA,
    'update public.audit_log set action = $1 where id = $2',
    ['delete', audit.id],
  );
  await assertWriteRejected(
    ids.directionA,
    'delete from public.audit_log where id = $1',
    [audit.id],
  );
  await assertWriteRejected(
    ids.directionA,
    `insert into public.audit_log (
      school_id, actor_id, action, entity_table, entity_id
    ) values ($1, $2, 'insert', 'students', $3)`,
    [ids.schoolA, ids.directionA, ids.studentA1],
  );
});
