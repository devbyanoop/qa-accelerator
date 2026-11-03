export function isSortedAscending(values: number[]): boolean {
  return values.every((value, i) => i === 0 || (values[i - 1] as number) <= value);
}

export function isSortedDescending(values: number[]): boolean {
  return values.every((value, i) => i === 0 || (values[i - 1] as number) >= value);
}
