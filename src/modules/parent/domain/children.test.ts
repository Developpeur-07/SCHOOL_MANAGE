import { describe, expect, it } from 'vitest';
import {
  findLinkedChild,
  getChildDisplayName,
  getSingleChildPath,
  mapLinkedChild,
} from './children';

const firstRow = {
  student: {
    id: '11000000-0000-4000-8000-000000000001',
    first_name: 'Enfant-Démo-A1',
    last_name: 'Fictif',
    student_code: 'ELEVE-DEMO-A1',
    class: { name: 'Classe Démo A1' },
  },
};

const secondRow = {
  student: {
    ...firstRow.student,
    id: '11000000-0000-4000-8000-000000000002',
    first_name: 'Enfant-Démo-A2',
    student_code: 'ELEVE-DEMO-A2',
    class: [{ name: 'Classe Démo A2' }],
  },
};

describe('sélecteur d’enfants liés', () => {
  it('mappe les données PostgREST sans données supplémentaires', () => {
    expect(mapLinkedChild(firstRow)).toEqual({
      id: firstRow.student.id,
      firstName: 'Enfant-Démo-A1',
      lastName: 'Fictif',
      studentCode: 'ELEVE-DEMO-A1',
      className: 'Classe Démo A1',
    });
    expect(mapLinkedChild(secondRow).className).toBe('Classe Démo A2');
  });

  it('redirige uniquement un parent ayant exactement un enfant', () => {
    const first = mapLinkedChild(firstRow);
    const second = mapLinkedChild(secondRow);

    expect(getSingleChildPath([])).toBeNull();
    expect(getSingleChildPath([first])).toBe(`/parent/${first.id}`);
    expect(getSingleChildPath([first, second])).toBeNull();
  });

  it('ne retrouve jamais un identifiant d’enfant non lié', () => {
    const children = [mapLinkedChild(firstRow), mapLinkedChild(secondRow)];
    expect(findLinkedChild(children, firstRow.student.id)?.id).toBe(firstRow.student.id);
    expect(findLinkedChild(children, 'uuid-inconnu')).toBeNull();
  });

  it('compose un nom affichable et refuse les lignes incomplètes', () => {
    expect(getChildDisplayName(mapLinkedChild(firstRow))).toBe('Enfant-Démo-A1 Fictif');
    expect(() => mapLinkedChild(null)).toThrow('CHILD_ROW_INVALID');
    expect(() => mapLinkedChild({ student: { id: firstRow.student.id } })).toThrow(
      'CHILD_ROW_INVALID_STUDENT',
    );
  });
});
