import { classifyInline, highlightInline } from '../src/composables/highlightInline.ts'

// `v-highlight-code` highlights prose `<code>` once the app runs. This does the same to the
// prerendered page, inside each element the directive marked, so it is highlighted from the start.

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])
const RAW = new Set(['script', 'style', 'textarea', 'title'])
const TAG =
  /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'=<>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g

interface Frame {
  name: string
  /** Inside the directive's element. */
  marked: boolean
  /** Inside something the directive leaves alone (its `SKIP`). */
  skipped: boolean
}

export async function highlightPrerenderedCode(html: string): Promise<string> {
  if (!html.includes('data-highlight-code')) return html
  const edits: { start: number; end: number; text: Promise<string> }[] = []
  const stack: Frame[] = []
  TAG.lastIndex = 0
  for (let match = TAG.exec(html); match; match = TAG.exec(html)) {
    const [, closing, rawName, attrs = '', selfClosing] = match
    const name = rawName!.toLowerCase()
    if (closing) {
      const at = stack.findLastIndex((frame) => frame.name === name)
      if (at !== -1) stack.length = at
      continue
    }
    const parent = stack.at(-1)
    if (name === 'code' && parent?.marked && !parent.skipped && !hasClass(attrs, 'inline-code')) {
      const close = html.indexOf('</code>', TAG.lastIndex)
      if (close === -1) break
      const start = match.index
      const inner = html.slice(TAG.lastIndex, close)
      edits.push({ start, end: close + 7, text: highlightCode(attrs, inner) })
      TAG.lastIndex = close + 7
      continue
    }
    if (RAW.has(name)) {
      const close = html.indexOf(`</${name}`, TAG.lastIndex)
      if (close !== -1) TAG.lastIndex = close
      continue
    }
    if (VOID.has(name) || selfClosing) continue
    stack.push({
      name,
      marked: !!parent?.marked || /\sdata-highlight-code\b/.test(attrs),
      skipped:
        !!parent?.skipped ||
        name === 'pre' ||
        hasClass(attrs, 'inline-code') ||
        hasClass(attrs, 'demo-preview') ||
        /\sdata-no-highlight\b/.test(attrs),
    })
  }
  if (edits.length === 0) return html
  const parts = await Promise.all(edits.map((edit) => edit.text))
  let out = ''
  let from = 0
  edits.forEach((edit, i) => {
    out += html.slice(from, edit.start) + parts[i]
    from = edit.end
  })
  return out + html.slice(from)
}

// As vHighlightCode's `highlightWithin` does it to one `<code>`.
async function highlightCode(attrs: string, inner: string): Promise<string> {
  const text = decode(inner.replace(/<[^>]*>/g, ''))
  if (!text) return `<code${attrs}>${inner}</code>`
  const kind = classifyInline(text)
  const classes = new Set((attrs.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/))
  classes.delete('')
  if (kind === 'ref') classes.add('code-ref')
  if (!/\s/.test(text)) classes.add('code-token')
  let rest = attrs.replace(/\sclass="[^"]*"/, '') + ` data-highlighted="${escape(text)}"`
  let body = inner
  if (kind !== 'ref' && kind !== 'plain') {
    const lang = kind === 'code' ? 'ts' : kind
    const swatch =
      kind === 'cssValue' ? `<i class="code-swatch" style="background:${escape(text)}"></i>` : ''
    body = swatch + (await highlightInline(text, lang))
    classes.add('shiki')
    rest += ` data-shiki="${lang}"`
  }
  const classAttr = classes.size ? ` class="${[...classes].join(' ')}"` : ''
  return `<code${classAttr}${rest}>${body}</code>`
}

function hasClass(attrs: string, name: string): boolean {
  const value = attrs.match(/\sclass="([^"]*)"/)?.[1]
  return !!value && value.split(/\s+/).includes(name)
}

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1] === 'x' || entity[1] === 'X'
      return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10))
    }
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    }
    return named[entity.toLowerCase()]!
  })
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
