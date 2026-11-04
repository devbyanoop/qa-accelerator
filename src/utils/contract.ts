export type FieldType = 'string' | 'number' | 'boolean' | 'array';

/**
 * Compares the shape of an API response with the fields a consumer relies on. Returns a list of problems, so a
 * failing test names every mismatch at once instead of stopping at the first. Extra fields are allowed.
 */
export function shapeProblems(value: unknown, shape: Record<string, FieldType>): string[] {
  if (typeof value !== 'object' || value === null) {
    return [`expected an object, got ${value === null ? 'null' : typeof value}`];
  }
  const record = value as Record<string, unknown>;
  const problems: string[] = [];
  for (const [field, expected] of Object.entries(shape)) {
    if (!(field in record)) {
      problems.push(`${field}: missing`);
      continue;
    }
    const actual = Array.isArray(record[field]) ? 'array' : typeof record[field];
    if (actual !== expected) {
      problems.push(`${field}: expected ${expected}, got ${actual}`);
    }
  }
  return problems;
}
