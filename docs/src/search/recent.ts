// What the palette shows before you type: the pages and results you opened last, newest first.
// Kept per browser, a handful at most, and only ids; the palette looks them up again on open.
const KEY = 'vael-ui-docs-recent'
const LIMIT = 6

export function recentIds(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function remember(id: string): void {
  try {
    const next = [id, ...recentIds().filter((existing) => existing !== id)].slice(0, LIMIT)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or storage off: the palette starts without recents, which is fine.
  }
}
