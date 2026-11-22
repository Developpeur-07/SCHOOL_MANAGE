import { describe, expect, it } from 'vitest';
import {
  mapAttendanceRow,
  parseAttendanceStatus,
  summarizeAttendance,
  type ParentAttendance,
} from './attendance';

const row = {
  id: '17000000-0000-4000-8000-000000000001',
  attendance_date: '2026-11-06',
  status: 'absent',
  comment: 'Absence fictive de test',
};

describe('mapAttendanceRow', () => {
  it('mappe un relevé de présence', () => {
    expect(mapAttendanceRow(row)).toEqual({
      id: row.id,
      date: '2026-11-06',
      status: 'absent',
      comment: 'Absence fictive de test',
    });
  });

  it('accepte un commentaire vide ou absent', () => {
    expect(mapAttendanceRow({ ...row, comment: null }).comment).toBeNull();
    expect(mapAttendanceRow({ ...row, comment: '' }).comment).toBeNull();
  });

  it('refuse une date ou un statut invalide', () => {
    expect(() => mapAttendanceRow({ ...row, attendance_date: '06/11/2026' })).toThrow(
      'ATTENDANCE_ROW_INVALID_DATE',
    );
    expect(() => mapAttendanceRow({ ...row, status: 'unknown' })).toThrow(
      'ATTENDANCE_STATUS_INVALID',
    );
    expect(() => mapAttendanceRow(null)).toThrow('ATTENDANCE_ROW_INVALID');
  });
});

describe('parseAttendanceStatus', () => {
  it('accepte les quatre statuts de la V1', () => {
    expect(parseAttendanceStatus('present')).toBe('present');
    expect(parseAttendanceStatus('absent')).toBe('absent');
    expect(parseAttendanceStatus('late')).toBe('late');
    expect(parseAttendanceStatus('excused')).toBe('excused');
  });
});

describe('summarizeAttendance', () => {
  const build = (status: ParentAttendance['status']): ParentAttendance => ({
    id: status,
    date: '2026-11-06',
    status,
    comment: null,
  });

  it('compte chaque statut', () => {
    const summary = summarizeAttendance([
      build('present'),
      build('present'),
      build('absent'),
      build('late'),
      build('excused'),
    ]);

    expect(summary).toEqual({
      total: 5,
      present: 2,
      absent: 1,
      late: 1,
      excused: 1,
      presenceRate: 40,
    });
  });

  it('renvoie un taux nul sans relevé', () => {
    expect(summarizeAttendance([])).toEqual({
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      presenceRate: 0,
    });
  });
});
