/** Diacritic- and case-insensitive normalization, for matching typed queries against labels. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
