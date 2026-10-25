// Everything the docs palette can find: pages, the API of every component and composable,
// every example and every guide section. Pages are built up front; the rest loads the first
// time the palette opens, since it's large and most visits never search.
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import {
  PhArrowBendDownLeft,
  PhArrowsOutCardinal,
  PhAt,
  PhBell,
  PhBookOpen,
  PhCompass,
  PhCursorClick,
  PhFunction,
  PhGearSix,
  PhHash,
  PhLayout,
  PhLightning,
  PhListChecks,
  PhPlayCircle,
  PhPlug,
  PhPuzzlePiece,
  PhShootingStar,
  PhSlidersHorizontal,
  PhStack,
  PhSwatches,
  PhTable,
  PhTextbox,
} from '@phosphor-icons/vue'
import type { CommandPaletteItem } from 'vael-ui'
import { importCode } from '../importCode'
import type { SearchEntry } from './fuzzy'
import { categories } from '../taxonomy'
import { composableCategories } from '../composablesTaxonomy'
import { DIRECTIVES } from '../directivesTaxonomy'
import { directivesContent } from '../directivesContent'
import {
  GUIDE_ROUTES,
  MOTION_ROUTES,
  composableValue,
  directiveValue,
  guideValue,
  routeFor,
} from '../docsNav'
import { MOTION_CHAPTERS } from '../motionChapters'
import { BLOCKS } from '../motionBlocks'

export type ApiKind = 'props' | 'events' | 'slots' | 'exposed' | 'parameters' | 'returns'
export type EntryKind = 'page' | 'action' | 'example' | 'section' | 'token' | ApiKind

export interface PaletteEntry extends CommandPaletteItem, SearchEntry {
  kind: EntryKind
  /** Where choosing it goes. Actions run instead. */
  to?: RouteLocationRaw
  run?: () => void
  /** The page a result lives on: a component, composable or guide name. */
  parent?: string
  /** For drilling in with Tab: the component or composable this page or result belongs to. */
  scope?: string
  type?: string
  defaultValue?: string
  required?: boolean
  /** What ⌘C copies, and what the footer calls it. */
  copy?: string
  copyKind?: 'import' | 'usage' | 'link' | 'command'
  /** An element to land on when the hash target isn't there (an example shown without a title). */
  fallbackId?: string
}

type Translate = (key: string) => string
type Has = (key: string) => boolean

// No per-component icons exist, so each result carries its category's: it also says where it lives.
const CATEGORY_ICONS: Record<string, Component> = {
  setup: PhGearSix,
  actions: PhCursorClick,
  formsAndInputs: PhTextbox,
  selection: PhListChecks,
  overlays: PhStack,
  navigationAndMenus: PhCompass,
  feedback: PhBell,
  dataDisplay: PhTable,
  layoutAndStructure: PhLayout,
  gestures: PhArrowsOutCardinal,
}
const API_ICONS: Record<ApiKind, Component> = {
  props: PhSlidersHorizontal,
  events: PhLightning,
  slots: PhPuzzlePiece,
  exposed: PhPlug,
  parameters: PhSlidersHorizontal,
  returns: PhArrowBendDownLeft,
}
// Pages lead on an equal match; among the API, props are what people look for most.
const API_BOOST: Record<ApiKind, number> = {
  props: 0,
  parameters: 0,
  events: -2,
  returns: -2,
  slots: -3,
  exposed: -4,
}

// The Motion guide's copy carries inline HTML (<code>); the palette searches its text.
const htmlText = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/** Descriptions are written for the pages, with `code` in backticks; the palette shows plain text. */
export const plain = (text: string | undefined) =>
  text?.replace(/`/g, '').replace(/\s+/g, ' ').trim() || undefined

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
const lowerFirst = (name: string) => name.charAt(0).toLowerCase() + name.slice(1)

export function absoluteUrl(href: string): string {
  return typeof window === 'undefined' ? href : new URL(href, window.location.origin).href
}

/** Every page, grouped and ordered like the sidebar, components first. */
export function pageEntries(t: Translate, te: Has): PaletteEntry[] {
  const describe = (key: string) => (te(key) ? plain(t(key)) : undefined)
  return [
    ...categories.flatMap((category) => {
      const group = t(`taxonomy.${category.key}`)
      return category.components.map((name) => ({
        id: name,
        kind: 'page' as const,
        label: name,
        to: routeFor(name),
        description: describe(`descriptions.${name}`),
        text: describe(`descriptions.${name}`),
        icon: CATEGORY_ICONS[category.key],
        keywords: [group],
        boost: 8,
        group,
        scope: name,
        copy: `import { ${name} } from 'vael-ui'`,
        copyKind: 'import' as const,
      }))
    }),
    ...GUIDE_ROUTES.map((guide) => ({
      id: guideValue(guide.routeName),
      kind: 'page' as const,
      label: t(guide.labelKey),
      to: routeFor(guideValue(guide.routeName)),
      icon: PhBookOpen,
      boost: 6,
      group: t('nav.guides'),
    })),
    // The Motion section's pages, its customizing guide among them.
    ...MOTION_ROUTES.map((page) => ({
      id: guideValue(page.routeName),
      kind: 'page' as const,
      label: t(page.labelKey),
      to: routeFor(guideValue(page.routeName)),
      icon: PhShootingStar,
      keywords: [t('motionDocs.nav.motion')],
      boost: 6,
      group: t('motionDocs.nav.motion'),
    })),
    ...composableCategories.flatMap((category) =>
      category.items.map((name) => ({
        id: composableValue(name),
        kind: 'page' as const,
        label: name,
        to: routeFor(composableValue(name)),
        description: describe(`composableDescriptions.${name}`),
        text: describe(`composableDescriptions.${name}`),
        icon: PhFunction,
        keywords: [t(`composablesTaxonomy.${category.key}`)],
        boost: 6,
        group: t('nav.composables'),
        scope: name,
        copy: importCode([name]),
        copyKind: 'import' as const,
      })),
    ),
    ...DIRECTIVES.map((name) => ({
      id: directiveValue(name),
      kind: 'page' as const,
      label: directivesContent[name]!.label,
      to: routeFor(directiveValue(name)),
      description: plain(directivesContent[name]!.description),
      text: plain(directivesContent[name]!.description),
      icon: PhAt,
      boost: 6,
      group: t('nav.directives'),
      copy: importCode([name]),
      copyKind: 'import' as const,
    })),
  ]
}

interface MetaRow {
  name: string
  description?: string
  type?: string
  default?: string
  required?: boolean
}

// A line you can paste into a template: `loading`, `variant="primary"`, `v-model:open="open"`.
function propUsage(row: MetaRow, models: Set<string>): string {
  if (models.has(row.name)) {
    return row.name === 'modelValue'
      ? 'v-model="value"'
      : `v-model:${kebab(row.name)}="${row.name}"`
  }
  const attr = kebab(row.name)
  const type = (row.type ?? '').replace(/\s*\|\s*undefined$/, '').trim()
  // `boolean | "auto"` too: the bare attribute is what you'd write first.
  if (/\bboolean\b/.test(type)) return attr
  const quoted = row.default?.match(/^['"](.*)['"]$/)?.[1]
  if (quoted !== undefined) return `${attr}="${quoted}"`
  const literal = type.match(/^["']([^"']+)["']/)?.[1]
  if (literal) return `${attr}="${literal}"`
  if (type === 'string') return `${attr}=""`
  return `:${attr}=""`
}

function eventUsage(name: string): string {
  if (name.startsWith('update:')) {
    const model = name.slice('update:'.length)
    return model === 'modelValue' ? 'v-model="value"' : `v-model:${kebab(model)}="${model}"`
  }
  const handler = `on${name.replace(/(^|[-:])(\w)/g, (_, __, c: string) => c.toUpperCase())}`
  return `@${name}="${handler}"`
}

// Top-level keys of a slot's props type, `{ loading: boolean; el: HTMLElement }`, for `#default="{ loading, el }"`.
function slotKeys(type: string | undefined): string[] {
  if (!type?.startsWith('{')) return []
  const keys: string[] = []
  let depth = 0
  let token = ''
  for (const char of type.slice(1, -1)) {
    if ('{[(<'.includes(char)) depth++
    else if ('}])>'.includes(char)) depth--
    if (depth === 0 && (char === ':' || char === ';')) {
      const key = token.trim().replace(/\?$/, '')
      if (char === ':' && /^\w+$/.test(key)) keys.push(key)
      token = ''
      continue
    }
    if (depth === 0) token += char
  }
  return [...new Set(keys)]
}

function slotUsage(row: MetaRow): string {
  const keys = slotKeys(row.type)
  return keys.length > 0
    ? `<template #${row.name}="{ ${keys.join(', ')} }"></template>`
    : `<template #${row.name}></template>`
}

const GUIDE_FILES: Record<string, string> = {
  GettingStarted: 'getting-started',
  UsingWithTailwind: 'guide-tailwind',
  GlobalSetup: 'guide-global-setup',
  AnimationIntegration: 'guide-animation-integration',
  StylingAndLayers: 'guide-styling-and-layers',
  I18nKeys: 'guide-i18n-keys',
  AutoImport: 'guide-auto-import',
  Nuxt: 'guide-nuxt',
  Skill: 'guide-skill',
}
const guideSources = import.meta.glob(['../pages/GettingStarted.vue', '../pages/guides/*.vue'], {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

// The headings in a guide's template: `<h2 id="install">{{ t('gettingStarted.installTitle') }}</h2>`.
// An h3 without an id lands on the section heading above it.
function guideHeadings(source: string): { id: string; key: string }[] {
  const headings: { id: string; key: string }[] = []
  let section = ''
  for (const match of source.matchAll(
    /<h([23])(?:\s+id="([^"]+)")?[^>]*>\s*\{\{\s*t\('([^']+)'\)\s*\}\}\s*<\/h\1>/g,
  )) {
    const [, level, id, key] = match
    if (level === '2' && id) section = id
    const target = id ?? section
    if (target) headings.push({ id: target, key: key! })
  }
  return headings
}

/** The API, examples and guide sections. Loaded once, on first open. */
export async function loadDeepEntries(t: Translate): Promise<PaletteEntry[]> {
  const [
    { default: meta },
    { default: manifest },
    { composablesContent },
    { pairedComposables },
    guides,
  ] = await Promise.all([
    import('../generated/component-meta.json'),
    import('../generated/demo-manifest.json'),
    import('../composablesContent'),
    import('../pairedComposables'),
    Promise.all(
      Object.entries(guideSources).map(async ([path, load]) => ({
        file: path
          .split('/')
          .pop()!
          .replace(/\.vue$/, ''),
        source: await load(),
      })),
    ),
  ])
  const entries: PaletteEntry[] = []

  const componentMeta = meta as Record<string, Partial<Record<ApiKind, MetaRow[]>>>
  for (const [component, api] of Object.entries(componentMeta)) {
    const models = new Set(
      (api.events ?? [])
        .filter((event) => event.name.startsWith('update:'))
        .map((event) => event.name.slice('update:'.length)),
    )
    // A v-model (`defineModel`) shows up only as its `update:x` event, yet it's the prop people
    // look for first: list it as a prop too, landing on the event's row.
    const declared = new Set((api.props ?? []).map((row) => row.name))
    for (const event of api.events ?? []) {
      const model = event.name.startsWith('update:') ? event.name.slice('update:'.length) : null
      if (!model || declared.has(model)) continue
      const type = event.type?.match(/^\[\w+\??:\s*(.*)\]$/)?.[1]?.replace(/\s*\|\s*undefined$/, '')
      const binding = model === 'modelValue' ? 'v-model' : `v-model:${kebab(model)}`
      entries.push({
        id: `${component}:model:${model}`,
        kind: 'props',
        label: model,
        parent: component,
        scope: component,
        to: {
          name: 'component',
          params: { name: component },
          hash: `#events-${event.name.replace(/[^\w-]/g, '-')}`,
        },
        type,
        description: plain(`${binding}. ${event.description ?? ''}`),
        text: plain(`${binding} ${event.description ?? ''}`),
        keywords: [binding],
        icon: API_ICONS.props,
        boost: 1,
        group: t('component.props'),
        copy: eventUsage(event.name),
        copyKind: 'usage',
      })
    }
    for (const kind of ['props', 'events', 'slots', 'exposed'] as const) {
      for (const row of api[kind] ?? []) {
        entries.push({
          id: `${component}:${kind}:${row.name}`,
          kind,
          label: row.name,
          parent: component,
          scope: component,
          // Lands on the row in the page's API table.
          to: {
            name: 'component',
            params: { name: component },
            hash: `#${kind}-${row.name.replace(/[^\w-]/g, '-')}`,
          },
          type: kind === 'props' ? row.type?.replace(/\s*\|\s*undefined$/, '') : undefined,
          defaultValue: kind === 'props' ? row.default : undefined,
          required: row.required || undefined,
          description: plain(row.description),
          text: plain(row.description),
          icon: API_ICONS[kind],
          boost: API_BOOST[kind],
          group: t(`component.${kind}`),
          copy:
            kind === 'props'
              ? propUsage(row, models)
              : kind === 'events'
                ? eventUsage(row.name)
                : kind === 'slots'
                  ? slotUsage(row)
                  : `${lowerFirst(component)}Ref.value?.${row.name}`,
          copyKind: 'usage',
        })
      }
    }
  }

  const examples = manifest as Record<string, { examples: { id: string; title: string }[] }>
  for (const [component, { examples: list }] of Object.entries(examples)) {
    for (const example of list) {
      const slug = example.id.split('/').pop()!.replace(/^\d+-/, '')
      entries.push({
        id: `${component}:example:${slug}`,
        kind: 'example',
        label: example.title,
        parent: component,
        scope: component,
        to: { name: 'component', params: { name: component }, hash: `#example-${slug}` },
        fallbackId: 'examples',
        icon: PhPlayCircle,
        boost: 1,
        group: t('component.examples'),
        copyKind: 'link',
      })
    }
  }

  for (const [name, content] of Object.entries(composablesContent)) {
    for (const kind of ['parameters', 'returns'] as const) {
      for (const row of kind === 'parameters' ? content.params : content.returns) {
        entries.push({
          id: `composable:${name}:${kind}:${row.name}`,
          kind,
          label: row.name,
          parent: name,
          scope: name,
          to: {
            name: 'composable',
            params: { name },
            hash: `#${kind}-${row.name.replace(/[^\w-]/g, '-')}`,
          },
          type: row.type,
          description: plain(row.description),
          text: plain(row.description),
          icon: API_ICONS[kind],
          boost: API_BOOST[kind],
          group: t(`composable.${kind}`),
          copyKind: 'link',
        })
      }
    }
  }

  // Headless engines documented on their component's page (pairedComposables.ts).
  for (const [component, list] of Object.entries(pairedComposables)) {
    for (const paired of list) {
      const id = `composable-${paired.name.replace(/[^\w]+/g, '-')}`
      const page = { name: 'component', params: { name: component } }
      entries.push({
        id: `headless:${paired.name}`,
        kind: 'section',
        label: paired.name,
        parent: component,
        scope: paired.name,
        to: { ...page, hash: `#${id}` },
        description: plain(paired.description),
        text: plain(paired.description),
        icon: PhFunction,
        boost: 5,
        group: t('nav.composables'),
        copy: `import { ${(paired.installNames ?? [paired.name]).join(', ')} } from 'vael-ui'`,
        copyKind: 'import',
      })
      for (const kind of ['parameters', 'returns'] as const) {
        for (const row of kind === 'parameters' ? paired.params : paired.returns) {
          entries.push({
            id: `headless:${paired.name}:${kind}:${row.name}`,
            kind,
            label: row.name,
            parent: paired.name,
            scope: paired.name,
            to: { ...page, hash: `#${id}-${kind}-${row.name.replace(/[^\w-]/g, '-')}` },
            type: row.type,
            description: plain(row.description),
            text: plain(row.description),
            icon: API_ICONS[kind],
            boost: API_BOOST[kind],
            group: t(`composable.${kind}`),
            copyKind: 'link',
          })
        }
      }
    }
  }

  // Each section of the Motion guide, and each block.
  for (const chapter of MOTION_CHAPTERS) {
    const chapterTitle = t(`motionDocs.chapters.${chapter.id}.title`)
    for (const section of chapter.sections) {
      entries.push({
        id: `section:${chapter.routeName}:${section.id}`,
        kind: 'section',
        label: plain(t(`motionDocs.chapters.${chapter.id}.${section.id}.title`))!,
        parent: chapterTitle,
        to: { name: chapter.routeName, hash: `#${section.id}` },
        text: plain(htmlText(t(`motionDocs.chapters.${chapter.id}.${section.id}.body`))),
        // Its id as words too: `inView` is found by "in view".
        keywords: [section.id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()],
        icon: PhHash,
        boost: 4,
        group: t('motionDocs.nav.motion'),
        copyKind: 'link',
      })
    }
  }
  for (const block of BLOCKS) {
    entries.push({
      id: `section:motion-blocks:${block}`,
      kind: 'section',
      label: t(`motionDocs.blocks.items.${block}.title`),
      parent: t('motionDocs.nav.blocks'),
      to: { name: 'motion-blocks', hash: `#${block}` },
      text: plain(t(`motionDocs.blocks.items.${block}.body`)),
      icon: PhHash,
      boost: 3,
      group: t('motionDocs.nav.motion'),
      copyKind: 'link',
    })
  }

  for (const { file, source } of guides) {
    const routeName = GUIDE_FILES[file]
    if (!routeName) continue
    // The theming tokens the styling guide lists: `{ name: '--ui-radius', value, description }`.
    for (const [, name, value, key] of source.matchAll(
      /name:\s*'(--ui-[\w-]+)',\s*value:\s*'([^']*)',\s*description:\s*t\('([^']+)'\)/g,
    )) {
      entries.push({
        id: `token:${name}`,
        kind: 'token',
        label: name!,
        to: { name: routeName, hash: '#css-variables' },
        defaultValue: value && value !== '—' ? value : undefined,
        description: plain(t(key!)),
        text: plain(t(key!)),
        icon: PhSwatches,
        boost: 2,
        group: t('stylingLayers.cssVariablesTitle'),
        copy: `var(${name})`,
        copyKind: 'usage',
      })
    }
    const guide = GUIDE_ROUTES.find((route) => route.routeName === routeName)
    const guideTitle = t(guide?.labelKey ?? 'nav.gettingStarted')
    for (const heading of guideHeadings(source)) {
      entries.push({
        id: `section:${routeName}:${heading.key}`,
        kind: 'section',
        label: t(heading.key),
        parent: guideTitle,
        to: { name: routeName, hash: `#${heading.id}` },
        icon: PhHash,
        boost: 4,
        group: t('nav.guides'),
        copyKind: 'link',
      })
    }
  }
  return entries
}

// Two-letter pieces, for a lenient likeness score when nothing matches outright.
function bigrams(text: string): Set<string> {
  const lower = text.toLowerCase().replace(/[^a-z0-9]/g, '')
  const pairs = new Set<string>()
  for (let i = 0; i < lower.length - 1; i++) pairs.add(lower.slice(i, i + 2))
  return pairs
}

/** Up to `limit` names that look like the query, for "did you mean" when nothing matched. */
export function suggestions(query: string, entries: readonly PaletteEntry[], limit = 3): string[] {
  const wanted = bigrams(query)
  // Too little to go on: a three-letter slip matches half the index by accident.
  if (wanted.size < 3) return []
  const scored = new Map<string, number>()
  for (const entry of entries) {
    if (entry.kind === 'action' || entry.kind === 'section' || entry.kind === 'example') continue
    const have = bigrams(entry.label)
    let shared = 0
    for (const pair of wanted) if (have.has(pair)) shared++
    const score = (2 * shared) / (wanted.size + have.size)
    // Close enough to be the same name with a slip, not a stray shared syllable ("fecha", change).
    if (shared >= 3 && score > 0.5 && score > (scored.get(entry.label) ?? 0)) {
      scored.set(entry.label, score)
    }
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label)
}
