export interface LinkedChild {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  className: string | null;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`CHILD_ROW_INVALID_${field}`);
  }
  return value;
}

function readClassName(value: unknown): string | null {
  const schoolClass = Array.isArray(value) ? value[0] : value;
  if (
    schoolClass &&
    typeof schoolClass === 'object' &&
    'name' in schoolClass &&
    typeof schoolClass.name === 'string'
  ) {
    return schoolClass.name;
  }
  return null;
}

export function mapLinkedChild(row: unknown): LinkedChild {
  if (!row || typeof row !== 'object' || !('student' in row)) {
    throw new Error('CHILD_ROW_INVALID');
  }

  const student = row.student;
  if (!student || typeof student !== 'object') {
    throw new Error('CHILD_ROW_INVALID_STUDENT');
  }

  if (
    !('id' in student) ||
    !('first_name' in student) ||
    !('last_name' in student) ||
    !('student_code' in student) ||
    !('class' in student)
  ) {
    throw new Error('CHILD_ROW_INVALID_STUDENT');
  }

  return {
    id: readString(student.id, 'ID'),
    firstName: readString(student.first_name, 'FIRST_NAME'),
    lastName: readString(student.last_name, 'LAST_NAME'),
    studentCode: readString(student.student_code, 'STUDENT_CODE'),
    className: readClassName(student.class),
  };
}

export function getSingleChildPath(children: LinkedChild[]): string | null {
  return children.length === 1 ? `/parent/${children[0].id}` : null;
}

export function findLinkedChild(
  children: LinkedChild[],
  studentId: string,
): LinkedChild | null {
  return children.find((child) => child.id === studentId) ?? null;
}

export function getChildDisplayName(child: LinkedChild): string {
  return `${child.firstName} ${child.lastName}`;
}
