// Markdown for a component's API: the Props/Slots/Events/Exposed tables and its Motion section,
// from the metadata the docs site's API tables use. Shared by the skill references
// (sync-skill-references.mjs) and the site's llms.txt (llms.mjs).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const META_PATH = join(__dirname, '../src/generated/component-meta.json')
const MOTION_PATH = join(__dirname, '../src/generated/motion-meta.json')
const TYPES_PATH = join(__dirname, '../../packages/ui/src/motion/types.ts')

export const meta = JSON.parse(readFileSync(META_PATH, 'utf8'))
const motionMeta = existsSync(MOTION_PATH) ? JSON.parse(readFileSync(MOTION_PATH, 'utf8')) : {}
const motionTypes = readFileSync(TYPES_PATH, 'utf8')

// Same parent/child grouping as the docs site's ComponentPage `RELATED`.
export const RELATED = {
  DataTable: ['Column'],
  Accordion: ['AccordionItem'],
  Breadcrumb: ['BreadcrumbItem', 'BreadcrumbSeparator'],
}

export const cell = (text) =>
  (text ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim()
const code = (text) => (text ? `\`${cell(text)}\`` : '')

// A named union of literals (`ButtonVariant`) tells an agent nothing on its own, so spell out
// its members: `ButtonVariant | undefined` becomes `'primary' | 'secondary' | … | undefined`.
const LITERAL = /^(?:"[^"]*"|'[^']*'|-?\d+(?:\.\d+)?|true|false|null|undefined)$/
function typeText(row) {
  const members = row.schema?.kind === 'enum' ? row.schema.schema : null
  if (!members?.length || !members.every((m) => typeof m === 'string' && LITERAL.test(m)))
    return row.type
  const expanded = members.map((m) => m.replace(/^"(.*)"$/, "'$1'"))
  // Already literal (`"circle" | "line" | undefined`), or a boolean: nothing to spell out.
  if (
    !/[A-Za-z_]\w*/.test(
      row.type.replace(/"[^"]*"|'[^']*'|\b(?:undefined|null|true|false|boolean)\b/g, ''),
    )
  )
    return row.type
  const empty = expanded.filter((m) => m === 'undefined' || m === 'null')
  return [...expanded.filter((m) => !empty.includes(m)), ...empty].join(' | ')
}

export function table(rows, { withDefault = false } = {}) {
  if (rows.length === 0) return '_None._\n'
  const head = withDefault
    ? 'Name | Type | Default | Description\n--- | --- | --- | ---'
    : 'Name | Type | Description\n--- | --- | ---'
  const body = rows.map((row) => {
    const text = row.defaultText ?? row.default
    const defaultValue = text && text !== 'undefined' ? code(text) : ''
    return withDefault
      ? `${code(row.name)} | ${code(typeText(row))} | ${defaultValue} | ${cell(row.description)}`
      : `${code(row.name)} | ${code(typeText(row))} | ${cell(row.description)}`
  })
  return `${head}\n${body.join('\n')}\n`
}

export function sections(entry, level) {
  const h = '#'.repeat(level)
  return [
    `${h} Props\n\n${table(entry.props, { withDefault: true })}`,
    `${h} Slots\n\n${table(entry.slots)}`,
    `${h} Events\n\n${table(entry.events)}`,
    `${h} Exposed\n\n${table(entry.exposed)}`,
  ].join('\n')
}

// The keys a component's `motion` object takes, read from its type in motion/types.ts.
function declOf(type) {
  const start = motionTypes.indexOf(`export type ${type}`)
  if (start === -1) return ''
  const next = motionTypes.slice(start + 1).search(/\n(?:\/\*\*|\/\/|export )/)
  return motionTypes.slice(start, next === -1 ? undefined : start + 1 + next)
}
function motionKeys(type, seen = new Set()) {
  if (seen.has(type)) return new Set()
  seen.add(type)
  const body = declOf(type)
  const keys = new Set()
  const spec = body.match(/ComponentMotion<\s*\{([\s\S]*?)\}/)?.[1]
  if (!spec) {
    // An alias (Tooltip's is Popover's), or written out by hand (Calendar's).
    const alias = body.match(/=\s*(?:\w+<\s*)*?(\w+Motion)\b/)?.[1]
    if (alias && alias !== type) for (const key of motionKeys(alias, seen)) keys.add(key)
    for (const m of body.matchAll(/\b(initial|exit|spring|duration|easing)\?:/g)) keys.add(m[1])
  } else {
    const has = (kind) => new RegExp(`\\b${kind}:\\s*true`).test(spec)
    keys.add('initial')
    if (/states:/.test(spec)) keys.add('states')
    if (has('overlay'))
      for (const k of ['exit', 'enter', 'leave', 'targets', 'morph', 'exitOrder', 'resize'])
        keys.add(k)
    if (type === 'PopoverMotion') keys.add('surface')
    if (has('presence')) for (const k of ['exit', 'enter', 'leave', 'targets']) keys.add(k)
    if (has('list'))
      for (const k of ['exit', 'enter', 'leave', 'stagger', 'leaving', 'appear']) keys.add(k)
    if (has('linked')) keys.add('linked')
    if (has('indicator')) keys.add('move')
    if (has('stretch')) for (const k of ['stretch', 'squash']) keys.add(k)
    if (has('swap')) for (const k of ['swap', 'direction', 'exit']) keys.add(k)
    if (has('value')) keys.add('when')
    if (!has('overlay') && !has('presence') && !has('list'))
      for (const k of ['replay', 'appear']) keys.add(k)
    if (/^export type \w+ = WithStagger</m.test(body)) keys.add('stagger')
  }
  for (const m of body.matchAll(/\b(chips|items)\?:/g)) keys.add(m[1])
  return keys
}
/** `guide`: where the Motion guide is, from the page this lands on. */
export function motionSection(name, level, guide = '../guides/motion.md') {
  const info = motionMeta[name]
  if (!info) return ''
  const h = '#'.repeat(level)
  const list = (items) => items.map((item) => `\`${item}\``).join(', ')
  const keys = [...motionKeys(info.type)]
  if (keys.some((k) => ['initial', 'exit', 'states'].includes(k)) || keys.includes('move'))
    keys.unshift('spring', 'duration', 'easing')
  const lines = [
    `${h} Motion\n`,
    `\`motion\` takes \`${info.type}\` (exported from \`'vael-ui'\`); \`false\` turns it off. ${cell(info.doc).replace(/\s*`false` turns it off\.$/, '')}\n`,
  ]
  if (info.parts.length) lines.push(`- Parts: ${list(info.parts)}`)
  if (info.states.length) lines.push(`- States: ${list(info.states)}`)
  lines.push(`- Keys: ${list([...new Set(keys)])}`)
  for (const extra of info.extras)
    lines.push(`- \`${extra.key}\` (\`${extra.type}\`): ${cell(extra.doc)}`)
  lines.push('', `See the [Motion guide](${guide}) for what each key does.`)
  return `\n${lines.join('\n')}\n`
}
