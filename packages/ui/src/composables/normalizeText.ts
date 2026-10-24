/** @internal Not public API; used by vael-ui's own components and may change.
 * Diacritic- and case-insensitive normalization, for matching typed queries against labels. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
