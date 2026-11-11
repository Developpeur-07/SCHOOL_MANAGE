/**
 * Serveur Supabase local, utilisé uniquement par les tests Playwright.
 *
 * Objectif : pouvoir exercised en local l’espace parent (les cinq onglets)
 * sans dépendre du projet Supabase hébergé, dont l’accès est bloqué depuis
 * l’environnement de test.
 *
 * Le serveur implémente le strict nécessaire :
 *  - `POST /auth/v1/token` (connexion) et `GET /auth/v1/user` (session) ;
 *  - `GET /rest/v1/<table>` avec la syntaxe PostgREST utilisée par l’application
 *    (`select` imbriqué, filtres `eq.`, `not.is.null`, `order`, `limit`).
 *
 * Toutes les données sont fictives et reprennent les identifiants du seed
 * afin que les tests restent lisibles.
 *
 * Volontairement, ce serveur laisse passer une note en brouillon pour
 * l’enfant lié : l’interface doit filtrer les brouillons elle-même, et pas
 * seulement s’appuyer sur la RLS. Le test E2E vérifie donc réellement
 * que le brouillon n’apparaît jamais.
 */

import { createServer } from 'node:http';

const DEMO_EMAIL = 'parent.demo@example.invalid';
const DEMO_PASSWORD = 'SchoolDemo2026!Parent';

const SCHOOL_ID = '10000000-0000-4000-8000-000000000001';
const PARENT_ID = 'a0000000-0000-4000-8000-000000000010';
const OTHER_PARENT_ID = 'a0000000-0000-4000-8000-000000000012';
const STUDENT_A1 = '11000000-0000-4000-8000-000000000001';
const STUDENT_A2 = '11000000-0000-4000-8000-000000000002';
const STUDENT_A3 = '11000000-0000-4000-8000-000000000003';
/** Enfant fictif dont les lectures échouent : sert à tester l’état d’erreur. */
export const STUDENT_ERROR = '11000000-0000-4000-8000-0000000000ff';

export const DEMO_CREDENTIALS = Object.freeze({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});

const TABLES = {
  schools: [
    {
      id: SCHOOL_ID,
      name: 'École Démo Fictive',
      currency_code: 'XAF',
      locale: 'fr-CG',
    },
  ],
  profiles: [
    {
      id: PARENT_ID,
      school_id: SCHOOL_ID,
      role: 'parent',
      full_name: 'Parent Démo Fictif',
      is_active: true,
    },
    {
      id: OTHER_PARENT_ID,
      school_id: SCHOOL_ID,
      role: 'parent',
      full_name: 'Autre Parent Fictif',
      is_active: true,
    },
  ],
  classes: [
    { id: '12000000-0000-4000-8000-000000000001', school_id: SCHOOL_ID, name: '6ème A' },
    { id: '12000000-0000-4000-8000-000000000002', school_id: SCHOOL_ID, name: '5ème B' },
  ],
  students: [
    {
      id: STUDENT_A1,
      school_id: SCHOOL_ID,
      class_id: '12000000-0000-4000-8000-000000000001',
      student_code: 'ELEVE-DEMO-A1',
      first_name: 'Enfant',
      last_name: 'Démo A1',
    },
    {
      id: STUDENT_A2,
      school_id: SCHOOL_ID,
      class_id: '12000000-0000-4000-8000-000000000002',
      student_code: 'ELEVE-DEMO-A2',
      first_name: 'Enfant',
      last_name: 'Démo A2',
    },
    {
      id: STUDENT_A3,
      school_id: SCHOOL_ID,
      class_id: '12000000-0000-4000-8000-000000000001',
      student_code: 'ELEVE-DEMO-A3',
      first_name: 'Enfant',
      last_name: 'Démo A3',
    },
    {
      id: STUDENT_ERROR,
      school_id: SCHOOL_ID,
      class_id: '12000000-0000-4000-8000-000000000001',
      student_code: 'ELEVE-DEMO-ERREUR',
      first_name: 'Enfant',
      last_name: 'Démo Erreur',
    },
  ],
  subjects: [
    { id: '13000000-0000-4000-8000-000000000001', school_id: SCHOOL_ID, name: 'Mathématiques' },
    { id: '13000000-0000-4000-8000-000000000002', school_id: SCHOOL_ID, name: 'Français' },
  ],
  periods: [
    { id: '14000000-0000-4000-8000-000000000001', school_id: SCHOOL_ID, name: 'Trimestre Démo 1' },
  ],
  guardian_links: [
    {
      id: '15000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      guardian_id: PARENT_ID,
      student_id: STUDENT_A1,
      is_active: true,
      created_at: '2026-09-01T08:00:00Z',
    },
    {
      id: '15000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      guardian_id: PARENT_ID,
      student_id: STUDENT_A2,
      is_active: true,
      created_at: '2026-09-02T08:00:00Z',
    },
    {
      id: '15000000-0000-4000-8000-000000000003',
      school_id: SCHOOL_ID,
      guardian_id: OTHER_PARENT_ID,
      student_id: STUDENT_A3,
      is_active: true,
      created_at: '2026-09-03T08:00:00Z',
    },
    {
      id: '15000000-0000-4000-8000-000000000004',
      school_id: SCHOOL_ID,
      guardian_id: PARENT_ID,
      student_id: STUDENT_ERROR,
      is_active: true,
      created_at: '2026-09-04T08:00:00Z',
    },
  ],
  grades: [
    {
      id: '16000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      subject_id: '13000000-0000-4000-8000-000000000001',
      period_id: '14000000-0000-4000-8000-000000000001',
      evaluation_label: 'Devoir fictif A1',
      score: 14.5,
      max_score: 20,
      status: 'published',
      published_at: '2026-11-02T09:00:00Z',
    },
    {
      id: '16000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      subject_id: '13000000-0000-4000-8000-000000000002',
      period_id: '14000000-0000-4000-8000-000000000001',
      evaluation_label: 'Composition fictive A1',
      score: 16,
      max_score: 20,
      status: 'published',
      published_at: '2026-11-05T09:00:00Z',
    },
    {
      // Brouillon : la RLS le masquerait, l’interface doit aussi le filtrer.
      id: '16000000-0000-4000-8000-000000000004',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      subject_id: '13000000-0000-4000-8000-000000000001',
      period_id: '14000000-0000-4000-8000-000000000001',
      evaluation_label: 'Brouillon jamais publié',
      score: 5,
      max_score: 20,
      status: 'draft',
      published_at: null,
    },
    {
      id: '16000000-0000-4000-8000-000000000003',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A2,
      subject_id: '13000000-0000-4000-8000-000000000002',
      period_id: '14000000-0000-4000-8000-000000000001',
      evaluation_label: 'Devoir fictif A2',
      score: 12,
      max_score: 20,
      status: 'published',
      published_at: '2026-11-03T09:00:00Z',
    },
    {
      id: '16000000-0000-4000-8000-000000000009',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A3,
      subject_id: '13000000-0000-4000-8000-000000000001',
      period_id: '14000000-0000-4000-8000-000000000001',
      evaluation_label: 'Devoir d’un autre enfant',
      score: 19,
      max_score: 20,
      status: 'published',
      published_at: '2026-11-04T09:00:00Z',
    },
  ],
  attendance: [
    {
      id: '17000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      attendance_date: '2026-11-06',
      status: 'absent',
      comment: 'Absence fictive de test',
    },
    {
      id: '17000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      attendance_date: '2026-11-05',
      status: 'present',
      comment: null,
    },
    {
      id: '17000000-0000-4000-8000-000000000003',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      attendance_date: '2026-11-04',
      status: 'late',
      comment: 'Retard fictif de test',
    },
    {
      id: '17000000-0000-4000-8000-000000000004',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A2,
      attendance_date: '2026-11-06',
      status: 'present',
      comment: null,
    },
    {
      id: '17000000-0000-4000-8000-000000000005',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A3,
      attendance_date: '2026-11-06',
      status: 'absent',
      comment: 'Donnée d’un autre enfant',
    },
  ],
  fees: [
    {
      id: '18000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A1,
      label: 'Frais de scolarité A1',
      amount_minor: 50000,
      due_on: '2026-11-01',
    },
    {
      id: '18000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A2,
      label: 'Frais de scolarité A2',
      amount_minor: 30000,
      due_on: '2026-11-01',
    },
    {
      id: '18000000-0000-4000-8000-000000000003',
      school_id: SCHOOL_ID,
      student_id: STUDENT_A3,
      label: 'Frais d’un autre enfant',
      amount_minor: 70000,
      due_on: '2026-11-01',
    },
  ],
  payments: [
    {
      id: '19000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      fee_id: '18000000-0000-4000-8000-000000000001',
      student_id: STUDENT_A1,
      amount_minor: 20000,
      paid_at: '2026-11-02T09:00:00Z',
      payment_method: 'cash',
      receipt_number: 'REC-DEMO-A1',
      note: 'Paiement fictif partiel',
    },
    {
      id: '19000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      fee_id: '18000000-0000-4000-8000-000000000002',
      student_id: STUDENT_A2,
      amount_minor: 30000,
      paid_at: '2026-11-02T10:00:00Z',
      payment_method: 'bank_transfer',
      receipt_number: 'REC-DEMO-A2',
      note: 'Paiement fictif complet',
    },
  ],
  announcements: [
    {
      id: '1a000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      title: 'Réunion de rentrée fictive',
      body: 'Contenu entièrement fictif pour toute l’école.',
      status: 'published',
      published_at: '2026-11-01T08:00:00Z',
    },
    {
      id: '1a000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      title: 'Sortie scolaire fictive',
      body: 'Contenu fictif ciblant uniquement l’élève A1.',
      status: 'published',
      published_at: '2026-11-04T08:00:00Z',
    },
    {
      id: '1a000000-0000-4000-8000-000000000005',
      school_id: SCHOOL_ID,
      title: 'Brouillon invisible',
      body: 'Brouillon qui ne doit jamais être visible.',
      status: 'draft',
      published_at: null,
    },
  ],
  notifications: [
    {
      id: '1c000000-0000-4000-8000-000000000001',
      school_id: SCHOOL_ID,
      recipient_id: PARENT_ID,
      student_id: STUDENT_A1,
      announcement_id: '1a000000-0000-4000-8000-000000000001',
      event_type: 'announcement_published',
      title: 'Réunion de rentrée fictive',
      body: 'Notification fictive pour A1.',
      read_at: null,
      created_at: '2026-11-01T08:00:00Z',
    },
    {
      id: '1c000000-0000-4000-8000-000000000002',
      school_id: SCHOOL_ID,
      recipient_id: PARENT_ID,
      student_id: STUDENT_A2,
      announcement_id: '1a000000-0000-4000-8000-000000000001',
      event_type: 'announcement_published',
      title: 'Réunion de rentrée fictive',
      body: 'Notification fictive pour A2.',
      read_at: null,
      created_at: '2026-11-01T08:05:00Z',
    },
    {
      id: '1c000000-0000-4000-8000-000000000003',
      school_id: SCHOOL_ID,
      recipient_id: PARENT_ID,
      student_id: STUDENT_A1,
      announcement_id: '1a000000-0000-4000-8000-000000000002',
      event_type: 'announcement_published',
      title: 'Sortie scolaire fictive',
      body: 'Notification fictive ciblée sur A1.',
      read_at: null,
      created_at: '2026-11-04T08:00:00Z',
    },
    {
      id: '1c000000-0000-4000-8000-000000000004',
      school_id: SCHOOL_ID,
      recipient_id: OTHER_PARENT_ID,
      student_id: STUDENT_A3,
      announcement_id: '1a000000-0000-4000-8000-000000000001',
      event_type: 'announcement_published',
      title: 'Notification d’un autre parent',
      body: 'Ne doit jamais apparaître.',
      read_at: null,
      created_at: '2026-11-01T08:00:00Z',
    },
  ],
};

/** Relations utilisées par les `select` imbriqués de l’application. */
const RELATIONS = {
  profiles: { schools: 'school_id' },
  guardian_links: { students: 'student_id' },
  students: { classes: 'class_id' },
  grades: { subjects: 'subject_id', periods: 'period_id' },
};

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim().length > 0) parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function parseSelectItem(item) {
  const nested = item.match(/^([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)(!inner)?\s*\((.*)\)$/s);
  if (nested) {
    return {
      kind: 'nested',
      alias: nested[1],
      table: nested[2],
      columns: splitTopLevel(nested[4]),
    };
  }
  const plainNested = item.match(/^([A-Za-z0-9_]+)\s*\((.*)\)$/s);
  if (plainNested) {
    return {
      kind: 'nested',
      alias: plainNested[1],
      table: plainNested[1],
      columns: splitTopLevel(plainNested[2]),
    };
  }
  return { kind: 'column', name: item };
}

function buildShape(table, columns) {
  const relations = RELATIONS[table] ?? {};
  const shape = {};

  for (const rawColumn of columns) {
    const parsed = parseSelectItem(rawColumn);
    if (parsed.kind === 'column') {
      shape[parsed.name] = { kind: 'column', name: parsed.name };
      continue;
    }
    const foreignKey = relations[parsed.table];
    if (!foreignKey) {
      shape[parsed.alias] = { kind: 'nested', table: parsed.table, columns: parsed.columns };
      continue;
    }
    shape[parsed.alias] = {
      kind: 'nested',
      table: parsed.table,
      columns: parsed.columns,
      foreignKey,
    };
  }

  return shape;
}

function applyShape(row, shape) {
  const result = {};
  for (const [alias, definition] of Object.entries(shape)) {
    if (definition.kind === 'column') {
      result[alias] = row[definition.name] ?? null;
      continue;
    }
    const relatedRows = TABLES[definition.table] ?? [];
    const parentValue = row[definition.foreignKey];
    const related = relatedRows.find((candidate) => candidate.id === parentValue) ?? null;
    if (!related) {
      result[alias] = null;
      continue;
    }
    const nestedShape = buildShape(definition.table, definition.columns);
    result[alias] = applyShape(related, nestedShape);
  }
  return result;
}

function compareValues(left, right) {
  if (left === null || left === undefined) return -1;
  if (right === null || right === undefined) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function matchOperator(row, column, expression) {
  const [operator, ...rest] = expression.split('.');
  const value = rest.join('.');

  if (operator === 'eq') {
    if (value === 'null') return row[column] === null || row[column] === undefined;
    if (value === 'true') return row[column] === true;
    if (value === 'false') return row[column] === false;
    return String(row[column]) === value;
  }
  if (operator === 'neq') return String(row[column]) !== value;
  if (operator === 'gt') return compareValues(row[column], value) > 0;
  if (operator === 'gte') return compareValues(row[column], value) >= 0;
  if (operator === 'lt') return compareValues(row[column], value) < 0;
  if (operator === 'lte') return compareValues(row[column], value) <= 0;
  if (operator === 'not') {
    const [nestedOperator, nestedValue] = value.split('.');
    if (nestedOperator === 'is') {
      if (nestedValue === 'null') return row[column] !== null && row[column] !== undefined;
      return String(row[column]) !== nestedValue;
    }
    return true;
  }
  if (operator === 'is') {
    if (value === 'null') return row[column] === null || row[column] === undefined;
    return String(row[column]) === value;
  }
  if (operator === 'like') return String(row[column]).includes(value.replaceAll('*', ''));
  if (operator === 'in') {
    const values = value.replace(/^\(|\)$/g, '').split(',');
    return values.includes(String(row[column]));
  }
  return true;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function buildAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      sub: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: DEMO_EMAIL,
      session_id: 'local-e2e-session',
      iat: now,
      exp: now + 3600,
    }),
  );
  return `${header}.${payload}.signature-locale`;
}

function buildUser(userId, email) {
  const now = new Date().toISOString();
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
  };
}

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  response.end(payload);
}

function readBody(request) {
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
    });
    request.on('end', () => {
      try {
        resolve(raw.length > 0 ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function linkedStudentIds(userId) {
  return TABLES.guardian_links
    .filter((link) => link.guardian_id === userId && link.is_active)
    .map((link) => link.student_id);
}

/**
 * Filtre les notifications comme le ferait la RLS : destinataire connecté et
 * enfant réellement lié.
 */
function applyRls(table, rows, userId) {
  if (table === 'notifications') {
    const allowed = new Set(linkedStudentIds(userId));
    return rows.filter(
      (row) => row.recipient_id === userId && allowed.has(row.student_id),
    );
  }
  if (table === 'announcements') {
    const allowed = new Set(linkedStudentIds(userId));
    const targeted = new Set(
      TABLES.notifications
        .filter(
          (notification) =>
            notification.recipient_id === userId && allowed.has(notification.student_id),
        )
        .map((notification) => notification.announcement_id),
    );
    return rows.filter((announcement) => targeted.has(announcement.id));
  }
  return rows;
}

export function createMockSupabaseServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '', 'http://127.0.0.1');

    if (request.method === 'OPTIONS') {
      json(response, 204, {});
      return;
    }

    if (url.pathname === '/health') {
      json(response, 200, { status: 'ok' });
      return;
    }

    const authorization = request.headers.authorization ?? '';
    const token = authorization.replace(/^Bearer\s+/i, '');
    const payload = token ? decodeJwtPayload(token) : null;
    const userId = payload?.sub ?? null;

    if (url.pathname === '/auth/v1/token') {
      const body = await readBody(request);
      const grantType = url.searchParams.get('grant_type');
      if (grantType === 'password') {
        if (
          body.email !== DEMO_EMAIL ||
          body.password !== DEMO_PASSWORD
        ) {
          json(response, 400, {
            error: 'invalid_credentials',
            error_description: 'Invalid login credentials',
          });
          return;
        }
        json(response, 200, {
          access_token: buildAccessToken(PARENT_ID),
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'local-e2e-refresh-token',
          user: buildUser(PARENT_ID, DEMO_EMAIL),
        });
        return;
      }
      if (grantType === 'refresh_token') {
        json(response, 200, {
          access_token: buildAccessToken(PARENT_ID),
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'local-e2e-refresh-token',
          user: buildUser(PARENT_ID, DEMO_EMAIL),
        });
        return;
      }
      json(response, 400, { error: 'unsupported_grant_type' });
      return;
    }

    if (url.pathname === '/auth/v1/user') {
      if (!userId) {
        json(response, 401, { error: 'invalid_token' });
        return;
      }
      json(response, 200, buildUser(userId, DEMO_EMAIL));
      return;
    }

    if (url.pathname === '/auth/v1/logout') {
      response.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
      response.end();
      return;
    }

    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.slice('/rest/v1/'.length).replace(/\/$/, '');
      const sourceRows = TABLES[table];
      if (!sourceRows) {
        json(response, 404, { code: '42P01', message: `relation "${table}" does not exist` });
        return;
      }

      // Enfant de test d'erreur : les lectures métier échouent volontairement.
      const studentFilter = url.searchParams.get('student_id');
      if (studentFilter === `eq.${STUDENT_ERROR}`) {
        json(response, 500, {
          code: 'PGRST000',
          message: 'Échec simulé pour le test de reprise sur erreur',
          details: null,
          hint: null,
        });
        return;
      }

      let rows = sourceRows;
      if (userId) {
        rows = applyRls(table, rows, userId);
      } else {
        rows = [];
      }

      for (const [key, expression] of url.searchParams.entries()) {
        if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') continue;
        rows = rows.filter((row) => matchOperator(row, key, expression));
      }

      const order = url.searchParams.get('order');
      if (order) {
        const [column, direction] = order.split('.');
        rows = [...rows].sort((left, right) => {
          const comparison = compareValues(left[column], right[column]);
          return direction === 'desc' ? -comparison : comparison;
        });
      }

      const limit = url.searchParams.get('limit');
      if (limit) rows = rows.slice(0, Number(limit));

      const select = url.searchParams.get('select');
      if (!select) {
        json(response, 200, rows);
        return;
      }

      const shape = buildShape(table, splitTopLevel(select));
      json(response, 200, rows.map((row) => applyShape(row, shape)));
      return;
    }

    json(response, 404, { message: 'not found' });
  });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const port = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);
  createMockSupabaseServer().listen(port, '0.0.0.0', () => {
    console.log(`[mock-supabase] écoute sur http://127.0.0.1:${port}`);
  });
}
