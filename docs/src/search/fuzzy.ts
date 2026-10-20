// A small ranked fuzzy search for the docs palette. It has to find a component by a slip of
// the name ("datpicker", "dp"), a prop by its name or its component ("button loading"), and
// anything by a few words of its description ("overlapping promise").

export interface SearchEntry {
  /** What the row is called: a component, guide, prop, event or slot name. */
  label: string
  /** The component a prop, event or slot belongs to. */
  parent?: string
  /** Plain description text, matched by its words and phrases. */
  text?: string
  /** Extra terms, such as the category. */
  keywords?: string[]
  /** Added to the score, so pages lead API entries on an equal match. */
  boost?: number
}

// Words that say nothing about what you're after. Joining words: "forms and inputs" means
// forms, inputs. Question words: "how do I close a dialog" means close, dialog.
const FILLER = new Set(
  (
    'a an and the of or to in on for with & + / ' +
    'how do does did i can could what is are was when why where which who my it its me you ' +
    'your should would will be there this that if so then want need way'
  ).split(' '),
)

/**
 * The words of a query that count: lowercase, filler dropped, `v-model:x` read as `update:x`.
 * Pasted code counts too: `<Dialog v-model:open="open">` reads as dialog, update:open, open,
 * and `@update:open`, `#default` or `:loading` lose their template sigil.
 */
export function queryTerms(query: string): string[] {
  const terms = query
    .trim()
    .toLowerCase()
    .replace(/\bv-model:/g, 'update:')
    .replace(/[<>"'`=(){}[\],;!?*]+/g, ' ')
    .split(/\s+/)
    .map((term) => term.replace(/^[@#:.]+|[.:]+$/g, ''))
    .filter(Boolean)
  const meaningful = terms.filter((term) => !FILLER.has(term))
  // A query of only filler words still searches for them.
  return meaningful.length > 0 ? meaningful : terms
}

// "inputs" finds Input, "props" finds a prop: a plural also matches its singular.
function singular(term: string): string | null {
  return term.length > 3 && term.endsWith('s') && !term.endsWith('ss') ? term.slice(0, -1) : null
}

/** Splits `DatePicker`, `update:pressed` or `v-scroll-mask` into lowercase words. */
export function words(label: string): string[] {
  return label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
}

function initials(label: string): string {
  return words(label)
    .map((word) => word[0])
    .join('')
}

// Every letter of the term, in order, inside the target; 0 for no, up to 1 for close together.
function subsequence(term: string, target: string): number {
  let from = 0
  let gaps = 0
  for (const char of term) {
    const at = target.indexOf(char, from)
    if (at === -1) return 0
    if (at > from) gaps += at - from
    from = at + 1
  }
  return 1 / (1 + gaps / term.length)
}

// One insertion, deletion, substitution or swap of neighbours apart (Damerau, capped at 1).
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

/** How well one query word matches the entry; 0 when it doesn't. */
export function scoreTerm(term: string, entry: SearchEntry): number {
  const base = scoreWord(term, entry)
  const stem = singular(term)
  return stem ? Math.max(base, scoreWord(stem, entry) - 2) : base
}

function scoreWord(term: string, entry: SearchEntry): number {
  const label = entry.label.toLowerCase()
  if (label === term) return 100
  if (label.startsWith(term)) return 90 - Math.min(10, (label.length - term.length) / 2)
  const labelWords = words(entry.label)
  if (labelWords.some((word) => word.startsWith(term))) return 80
  if (term.length >= 2 && initials(entry.label).startsWith(term)) return 75
  if (label.includes(term)) return 70
  if (entry.parent) {
    const parent = entry.parent.toLowerCase()
    if (parent === term) return 60
    if (parent.startsWith(term)) return 55
  }
  if (entry.keywords?.some((keyword) => keyword.toLowerCase().includes(term))) return 45
  if (term.length >= 3) {
    const loose = subsequence(term, label)
    if (loose > 0.5) return 40 + 10 * loose
  }
  if (term.length >= 4) {
    const candidates = [label, ...labelWords]
    const typo = candidates.some(
      (word) =>
        withinOneEdit(term, word) ||
        withinOneEdit(term, word.slice(0, term.length)) ||
        withinOneEdit(term, word.slice(0, term.length + 1)),
    )
    if (typo) return 35
    if (entry.parent && withinOneEdit(term, entry.parent.toLowerCase())) return 30
  }
  if (entry.text && term.length >= 3) {
    const text = entry.text.toLowerCase()
    if (text.includes(term)) return 25
  }
  return 0
}

/** The entry's score for a whole query: every word has to match somewhere. */
export function scoreEntry(query: string, entry: SearchEntry): number {
  const terms = queryTerms(query)
  const normalized = terms.join(' ')
  if (terms.length === 0) return 0
  // One word that only names the component would list every prop it has; the component's
  // name narrows the API only next to another word ("button loading").
  if (
    terms.length === 1 &&
    entry.parent &&
    scoreTerm(terms[0]!, { ...entry, parent: undefined }) === 0
  ) {
    return 0
  }
  let total = 0
  for (const term of terms) {
    const score = scoreTerm(term, entry)
    if (score === 0) return 0
    total += score
  }
  // A phrase from the description, word for word, ranks above scattered words.
  if (terms.length > 1 && entry.text?.toLowerCase().includes(normalized)) total += 10
  // Named exactly: "dialog open" wants the `open` prop before `open-change`.
  const exact = terms.includes(entry.label.toLowerCase()) ? 8 : 0
  return total / terms.length + exact + (entry.boost ?? 0)
}

/** The entries that match, best first, at most `limit` of them. */
export function search<T extends SearchEntry>(
  query: string,
  entries: readonly T[],
  limit = 50,
): T[] {
  const scored: { entry: T; score: number; order: number }[] = []
  entries.forEach((entry, order) => {
    const score = scoreEntry(query, entry)
    if (score > 0) scored.push({ entry, score, order })
  })
  // Nothing matched every word ("close a dialog when clicking outside"): show what matches most
  // of them instead of nothing, best coverage first.
  if (scored.length === 0) {
    const terms = queryTerms(query)
    if (terms.length > 1) {
      const needed = Math.ceil(terms.length / 2)
      entries.forEach((entry, order) => {
        const hits = terms.map((term) => scoreTerm(term, entry)).filter((score) => score > 0)
        if (hits.length < needed) return
        const coverage = hits.length / terms.length
        const total = hits.reduce((sum, score) => sum + score, 0)
        scored.push({ entry, score: (total / terms.length) * coverage + (entry.boost ?? 0), order })
      })
    }
  }
  scored.sort((a, b) => b.score - a.score || a.order - b.order)
  return scored.slice(0, limit).map(({ entry }) => entry)
}

/**
 * The parts of `text` to emphasise for this query: every place a query word (or its singular)
 * appears. `wholeWords` keeps prose quiet: "forms" lights up "form", not the start of "format".
 */
export function highlight(
  text: string,
  query: string,
  wholeWords = false,
): { text: string; match: boolean }[] {
  const lower = text.toLowerCase()
  const marks = Array.from({ length: text.length }, () => false)
  for (const term of queryTerms(query)) {
    for (const word of [term, singular(term)]) {
      if (!word || word.length < 2) continue
      let at = lower.indexOf(word)
      while (at !== -1) {
        const end = at + word.length
        const whole = !/[a-z0-9]/.test(lower[at - 1] ?? '') && !/[a-z0-9]/.test(lower[end] ?? '')
        if (!wholeWords || whole) marks.fill(true, at, end)
        at = lower.indexOf(word, end)
      }
    }
  }
  const parts: { text: string; match: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1)
    if (last && last.match === marks[i]) last.text += text[i]
    else parts.push({ text: text[i]!, match: marks[i]! })
  }
  return parts
}

/** Whether the query names this component, so its chip can show the match. */
export function namesComponent(query: string, component: string): boolean {
  const name = component.toLowerCase()
  return queryTerms(query).some((term) => {
    const word = singular(term) ?? term
    return term.length >= 2 && (name.startsWith(term) || name === word || name.startsWith(word))
  })
}
