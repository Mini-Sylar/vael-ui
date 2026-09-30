import { codeToHtml, codeToTokens } from 'shiki'

/** `type` highlights a TypeScript type expression (`boolean`, `'sm' | 'md'`). */
export type InlineLang = 'ts' | 'type' | 'vue' | 'css'

const themes = { light: 'github-light', dark: 'github-dark' } as const

// API tables highlight hundreds of short snippets per page, and the same
// ones (`boolean`, `'md'`, `false`) repeat across every table, so each
// distinct snippet is highlighted once and shared.
const cache = new Map<string, Promise<string>>()

/** Shiki-highlighted HTML for a short inline snippet, themed like `CodeBlock`. */
export function highlightInline(code: string, lang: InlineLang = 'ts'): Promise<string> {
  const key = `${lang}\u0000${code}`
  let html = cache.get(key)
  if (!html) {
    html =
      lang === 'type'
        ? highlightType(code)
        : codeToHtml(code, {
            lang,
            themes,
            defaultColor: false,
            structure: 'inline',
          })
    cache.set(key, html)
  }
  return html
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
  }
  return html
}

const TYPE_PREFIX = 'type _ = '

// A bare `boolean` or `string | HTMLElement` parses as an expression, where
// the TS grammar sees plain identifiers and leaves them uncolored. Wrapping it
// in a type alias puts it in type position; the prefix tokens are then
// dropped by offset.
async function highlightType(code: string): Promise<string> {
  const { tokens } = await codeToTokens(TYPE_PREFIX + code, {
    lang: 'ts',
    themes,
    defaultColor: false,
  })
  let html = ''
  for (const token of tokens.flat()) {
    const end = token.offset + token.content.length
    if (end <= TYPE_PREFIX.length) continue
    const content = token.content.slice(Math.max(0, TYPE_PREFIX.length - token.offset))
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
