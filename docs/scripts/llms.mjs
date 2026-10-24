// Writes the built site's files for language models (llmstxt.org): `llms.txt`, an index of every
// page with a one-line summary; a Markdown copy of each page beside its HTML (`/components/Select.md`);
// and `llms-full.txt`, all of them in one file. Run after the pages are rendered (vite-ssg's
// `onFinished`).
//   - Components, composables and directives come from the metadata their API tables use, so
//     every prop, type, default, slot, event and motion key is in them. Their rendered HTML
//     isn't enough: the tables and examples render in the browser.
//   - Guides and the motion pages are prose, converted from their rendered HTML by mdream.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlToMarkdown } from '@mdream/js'
import { filterPlugin, isolateMainPlugin } from '@mdream/js/plugins'
import { RELATED, cell, meta, motionSection, sections, table } from './api-markdown.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMOS_DIR = join(__dirname, '../src/composable-demos')
// Page chrome around a guide's prose: its kicker, the pager, the on-this-page list, the
// npm/pnpm and VDOM/Vapor switches above code samples, the docs dock and live widgets' controls.
const CHROME = [
  '.ui-dock',
  '.ui-switch',
  '.ui-slider',
  '.ui-animated-number',
  '.spring-read',
  '.spring-row',
  '.eyebrow',
  '.mc-eyebrow',
  '.docs-pager',
  '.on-this-page',
  '.ui-select-button',
  'button',
]

// Galleries of live demos whose code renders in the browser: nothing for a model to read.
const SKIP = new Set(['/motion/blocks', '/motion/side-by-side'])

const fence = (code, lang) => `\`\`\`${lang}\n${code.trim()}\n\`\`\``
const importLine = (names, comment = " // or 'vael-ui/vapor'") =>
  fence(`import { ${names.join(', ')} } from 'vael-ui'${comment}`, 'ts')
// A demo as its page shows it: without the notes and headings around the example.
const stripDemoProse = (source) =>
  source
    .replace(/[ \t]*<p class="note">[\s\S]*?<\/p>\n?/g, '')
    .replace(/[ \t]*<h[23]>[\s\S]*?<\/h[23]>\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
const sfcOrTs = (code) => (code.trimStart().startsWith('<') ? 'vue' : 'ts')
// The page's first paragraph, for its line in llms.txt.
const summaryOf = (markdown) =>
  markdown
    .split('\n\n')
    .find((block) => block.trim() && !/^(#|```|\||-|\[|>)/.test(block.trim()))
    ?.replace(/\s+/g, ' ')
    .trim() ?? ''

function composableMarkdown(name, content, summary, level = 1) {
  const h = '#'.repeat(level)
  const parts = [`${h} ${name}`, summary]
  if (content.description !== summary) parts.push(content.description)
  parts.push(importLine(content.installNames ?? [name]))
  const demo = join(DEMOS_DIR, `${name.charAt(0).toUpperCase()}${name.slice(1)}Demo.vue`)
  const example =
    content.exampleCode ??
    (content.hasLiveDemo && existsSync(demo)
      ? stripDemoProse(readFileSync(demo, 'utf8'))
      : undefined)
  if (example) parts.push(`${h}# Example`, fence(example, sfcOrTs(example)))
  parts.push(`${h}# Parameters`, table(content.params, { withDefault: true }).trim())
  parts.push(`${h}# Returns`, table(content.returns).trim())
  return parts.filter(Boolean).join('\n\n')
}

function a11yMarkdown(info) {
  if (!info) return ''
  const parts = ['## Accessibility']
  if (info.pattern)
    parts.push(
      `Follows the [${info.pattern.name}](${info.pattern.url}) pattern from the WAI-ARIA Authoring Practices Guide.`,
    )
  if (info.keyboard.length) {
    const keys = (text) =>
      text
        .split(' / ')
        .map((alternative) =>
          alternative
            .split(' + ')
            .map((key) => `\`${key}\``)
            .join(' + '),
        )
        .join(' / ')
    const rows = info.keyboard.map((row) => `${keys(row.keys)} | ${cell(row.action)}`)
    parts.push(`Key | Action\n--- | ---\n${rows.join('\n')}`)
  } else parts.push('It has no keyboard interaction of its own.')
  if (info.notes.length) parts.push(info.notes.map((note) => `- ${note}`).join('\n'))
  return parts.join('\n\n')
}

function componentMarkdown(name, summary, paired, origin, a11y) {
  const parts = [
    `# ${name}`,
    summary,
    importLine([name]),
    sections(meta[name], 2).trim(),
    motionSection(name, 2, `${origin}/motion.md`).trim(),
    a11yMarkdown(a11y),
  ]
  for (const child of RELATED[name] ?? [])
    if (meta[child]) parts.push(`## ${child}`, sections(meta[child], 3).trim())
  for (const composable of paired)
    parts.push(composableMarkdown(composable.name, composable, composable.description, 2))
  return parts.filter(Boolean).join('\n\n')
}

function directiveMarkdown(name, content) {
  const parts = [`# ${content.label}`, content.description, importLine(content.installNames)]
  parts.push('## Value', table(content.value).trim())
  if (content.modifiers?.length) parts.push('## Modifiers', table(content.modifiers).trim())
  return parts.join('\n\n')
}

function proseMarkdown(html, origin) {
  return (
    htmlToMarkdown(html, {
      origin,
      plugins: [isolateMainPlugin(), filterPlugin({ exclude: CHROME })],
    })
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .split('\n\n')
      // A heading whose section was only a live widget: nothing under it before the next one.
      .filter((block, i, blocks) => {
        const level = block.match(/^(#{2,6}) /)?.[1].length
        const next = blocks[i + 1]?.match(/^(#{1,6}) /)?.[1].length
        return !level || !next || next > level
      })
      .join('\n\n')
  )
}

// A section's rendered pages in the sidebar's order: from its first page along each page's "next"
// link (the pager follows the sidebar), then any it didn't reach.
function routesUnder(dist, dir, first) {
  const html = (route) => join(dist, route, 'index.html')
  const ordered = []
  for (let route = first; route && existsSync(html(route)) && !ordered.includes(route);) {
    ordered.push(route)
    const next = readFileSync(html(route), 'utf8').match(
      /<a href="([^"]+)" class="docs-pager-link docs-pager-link--next/,
    )?.[1]
    route = next?.startsWith(`/${dir}`) ? next : undefined
  }
  const rest = []
  const walk = (path, route) => {
    if (existsSync(join(path, 'index.html')) && !ordered.includes(route)) rest.push(route)
    for (const entry of readdirSync(path, { withFileTypes: true }))
      if (entry.isDirectory()) walk(join(path, entry.name), `${route}/${entry.name}`)
  }
  if (existsSync(join(dist, dir))) walk(join(dist, dir), `/${dir}`)
  return [...ordered, ...rest.sort()]
}

/**
 * @param {object} site
 * @param {string} site.dist The built site.
 * @param {string} site.origin Such as `https://vael-ui.dev`.
 * @param {{ name: string, components: string[] }[]} site.categories Components, by sidebar group.
 * @param {{ name: string, items: string[] }[]} site.composableCategories
 * @param {Record<string, any>} site.composablesContent
 * @param {Record<string, any[]>} site.pairedComposables Composables shown on a component's page.
 * @param {string[]} site.directives
 * @param {Record<string, any>} site.directivesContent
 * @param {Record<string, any>} site.messages The English locale.
 * @param {Record<string, any>} site.a11yContent Each component's Accessibility section.
 */
export function writeLlms(site) {
  const { dist, origin, messages } = site
  /** @type {{ section: string, title: string, route: string, summary: string, markdown: string }[]} */
  const pages = []
  const add = (section, title, route, markdown, summary = summaryOf(markdown)) =>
    pages.push({ section, title, route, summary: cell(summary), markdown })

  // Prose first, in reading order: getting started, the guides, then the motion guide.
  for (const [section, dir, first] of [
    ['Docs', 'docs', '/docs/getting-started'],
    ['Motion', 'motion', '/motion'],
  ])
    for (const route of routesUnder(dist, dir, first)) {
      if (SKIP.has(route)) continue
      const html = readFileSync(join(dist, route, 'index.html'), 'utf8')
      const markdown = proseMarkdown(html, origin)
      const title = markdown.match(/^# (.+)$/m)?.[1] ?? route
      add(section, title, route, markdown)
    }

  for (const category of site.categories)
    for (const name of category.components) {
      if (!meta[name]) continue
      const summary = messages.descriptions?.[name] ?? ''
      const paired = site.pairedComposables[name] ?? []
      add(
        `Components: ${category.name}`,
        name,
        `/components/${name}`,
        componentMarkdown(name, summary, paired, origin, site.a11yContent?.[name]),
        summary,
      )
    }

  for (const category of site.composableCategories)
    for (const name of category.items) {
      const content = site.composablesContent[name]
      if (!content) continue
      const summary = messages.composableDescriptions?.[name] ?? content.description
      add(
        `Composables: ${category.name}`,
        name,
        `/composables/${name}`,
        composableMarkdown(name, content, summary),
        summary,
      )
    }

  for (const name of site.directives) {
    const content = site.directivesContent[name]
    if (content)
      add('Directives', content.label, `/directives/${name}`, directiveMarkdown(name, content))
  }

  for (const page of pages) {
    const file = join(dist, `${page.route}.md`)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${page.markdown}\n`)
  }

  const intro = [
    '# vael-ui',
    `> ${messages.home.tagline}`,
    "Import from `'vael-ui'` (VDOM) or `'vael-ui/vapor'` (Vapor); the props are the same. Every page below is Markdown.",
  ].join('\n\n')
  const index = [intro]
  for (const section of new Set(pages.map((page) => page.section))) {
    const links = pages
      .filter((page) => page.section === section)
      .map(
        (page) =>
          `- [${page.title}](${origin}${page.route}.md)${page.summary ? `: ${page.summary}` : ''}`,
      )
    index.push(`## ${section}\n\n${links.join('\n')}`)
  }
  writeFileSync(join(dist, 'llms.txt'), `${index.join('\n\n')}\n`)

  const full = [intro, ...pages.map((page) => `${page.markdown}\n\nSource: ${origin}${page.route}`)]
  writeFileSync(join(dist, 'llms-full.txt'), `${full.join('\n\n---\n\n')}\n`)
  return pages.length
}
