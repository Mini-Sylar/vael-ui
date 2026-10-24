import { codeToHtml, codeToTokens } from 'shiki'

/**
 * - `ts`: a TypeScript expression (`openDialog()`, `'md'`, `true`).
 * - `type`: a TypeScript type (`boolean`, `'sm' | 'md'`).
 * - `cssVar`: a CSS custom property name (`--ui-primary`).
 * - `cssValue`: a CSS value (`#18181b`, `oklch(0.6 0.2 26)`).
 */
export type InlineLang = 'ts' | 'type' | 'cssVar' | 'cssValue' | 'vue' | 'css'

/**
 * How an inline snippet should render:
 * - `code`: TypeScript-ish (`openDialog()`, `'md'`, `true`), syntax-highlighted.
 * - `cssVar` / `cssValue`: a CSS custom property (`--ui-primary`) or value
 *   (`#18181b`, `oklch(…)`), highlighted as CSS.
 * - `ref`: an API name (`panelEl`, `ui.root`) or Vue template syntax
 *   (`v-model:open`, `@change`, `#item`, `<Dialog>`). A bare name has no
 *   syntax colors of its own and the TS grammar mangles template syntax, so
 *   both take the accent color.
 * - `plain`: shell commands and kebab-case names or paths (`tailwind-merge`,
 *   `vael-ui/vapor`), which TS would read as subtraction or division.
 */
export type InlineKind = 'code' | 'cssVar' | 'cssValue' | 'ref' | 'plain'

const LITERALS = new Set(['true', 'false', 'null', 'undefined'])

export function classifyInline(code: string): InlineKind {
  // Before the template-syntax check: `#18181b` is a color, `#item` a slot.
  if (/^#[\da-f]{3,8}$|^(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix|var)\(/i.test(code))
    return 'cssValue'
  if (/^(v-|@|#|<|:)/.test(code)) return 'ref'
  if (/^--[\w-]+$/.test(code)) return 'cssVar'
  if (!/[\w$]/.test(code)) return 'plain'
  if (/^(npm|pnpm|yarn|bun|npx) /.test(code)) return 'plain'
  if (/^[\w@.]+(?:[-/][\w@.*]+)+$/.test(code)) return 'plain'
  if (/^[A-Za-z_$][\w$]*(?:\.(?:[A-Za-z_$][\w$]*|\*))*$/.test(code) && !LITERALS.has(code)) {
    return 'ref'
  }
  return 'code'
}

const themes = { light: 'github-light', dark: 'github-dark' } as const

// API tables highlight hundreds of short snippets per page, and the same
// ones (`boolean`, `'md'`, `false`) repeat across every table, so each
// distinct snippet is highlighted once and shared.
const cache = new Map<string, Promise<string>>()

// Finished results by the same key, for a first render that shouldn't wait a frame: what has
// resolved here, plus what the prerendered page shipped (see `adoptPrerendered`).
const known = new Map<string, string>()

/** Shiki-highlighted HTML for a short inline snippet, themed like `CodeBlock`. */
export function highlightInline(code: string, lang: InlineLang = 'ts'): Promise<string> {
  const key = `${lang}\u0000${code}`
  let html = cache.get(key)
  if (!html) {
    if (lang === 'type') html = highlightInContext(code, 'ts', 'type _ = ', '')
    else if (lang === 'cssVar') html = highlightInContext(code, 'css', 'a{', ':0}')
    else if (lang === 'cssValue') html = highlightInContext(code, 'css', 'a{b:', '}')
    else html = codeToHtml(code, { lang, themes, defaultColor: false, structure: 'inline' })
    cache.set(key, html)
    html.then(
      (result) => known.set(key, result),
      () => {},
    )
  }
  return html
}

/** `highlightInline`'s result if it's already known, without waiting. */
export function highlightedInline(code: string, lang: InlineLang = 'ts'): string | undefined {
  return known.get(`${lang}\u0000${code}`)
}

// Code blocks: the same demo source renders in more than one place (a demo's
// code tab and its collapsible), so each distinct block is highlighted once.
const blockCache = new Map<string, Promise<string>>()

/** Shiki-highlighted HTML for a full code block (`CodeBlock`). */
export function highlightBlock(code: string, lang: string): Promise<string> {
  const key = `${lang}\u0000${code}`
  let html = blockCache.get(key)
  if (!html) {
    html = codeToHtml(code, { lang, themes, defaultColor: false })
    blockCache.set(key, html)
    html.then(
      (result) => known.set(`block:${key}`, result),
      () => {},
    )
  }
  return html
}

/** `highlightBlock`'s result if it's already known, without waiting. */
export function highlightedBlock(code: string, lang: string): string | undefined {
  return known.get(`block:${lang}\u0000${code}`)
}

/**
 * Reads the highlighting the prerendered page already shows, so the app that replaces it renders
 * the same HTML on its first frame. Each highlighted element carries `data-shiki` (its language,
 * `block:` first for a code block) and its text is the code.
 */
export function adoptPrerendered(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-shiki]')) {
    // A color's preview swatch is added beside the highlighting, not part of it.
    const swatch = el.querySelector(':scope > .code-swatch')
    const html = swatch ? el.innerHTML.replace(swatch.outerHTML, '') : el.innerHTML
    known.set(`${el.dataset.shiki}\u0000${el.textContent}`, html)
  }
}

/** A token with its light and dark colors, as an inline style for a `.shiki` ancestor to apply. */
export interface StyledToken {
  offset: number
  content: string
  style: string
}

/** A block's tokens, line by line, for code drawn from parts (an editor with clickable names) that
 * can't be highlighted as one HTML string but should still be colored in its full context. */
export async function tokenizeBlock(
  code: string,
  lang: 'vue' | 'ts' | 'css',
): Promise<StyledToken[][]> {
  const { tokens } = await codeToTokens(code, { lang, themes, defaultColor: false })
  return tokens.map((line) =>
    line.map((token) => ({
      offset: token.offset,
      content: token.content,
      style: Object.entries(token.htmlStyle ?? {})
        .map(([property, value]) => `${property}:${value}`)
        .join(';'),
    })),
  )
}

// A snippet on its own can parse as the wrong thing: a bare `boolean` is an
// uncolored identifier, not a type, and `--ui-primary` or `#18181b` isn't CSS
// at all.
// Highlighting it inside a context that puts it in the right position (a type
// alias, a CSS declaration or value), then keeping only its own characters, gives it
// the colors it has in real code.
async function highlightInContext(
  code: string,
  lang: 'ts' | 'css',
  prefix: string,
  suffix: string,
): Promise<string> {
  const { tokens } = await codeToTokens(prefix + code + suffix, {
    lang,
    themes,
    defaultColor: false,
  })
  const start = prefix.length
  const end = start + code.length
  let html = ''
  for (const token of tokens.flat()) {
    const from = Math.max(token.offset, start)
    const to = Math.min(token.offset + token.content.length, end)
    if (from >= to) continue
    const content = token.content.slice(from - token.offset, to - token.offset)
    const style = Object.entries(token.htmlStyle ?? {})
      .map(([property, value]) => `${property}:${value}`)
      .join(';')
    html += `<span style="${style}">${escapeHtml(content)}</span>`
  }
  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
