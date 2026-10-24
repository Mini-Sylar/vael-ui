#!/usr/bin/env node
// Run after `pnpm build`. Server-renders every component from both builds the way an SSR app
// would (through Vite's server module loader), so the "SSR ready" claim holds for `vael-ui` and
// `vael-ui/vapor` alike. Fails when a build can't load on the server, when a component touches
// a browser-only global during server rendering, or when the two builds disagree on which
// components render.
//
// Components are rendered bare, with no props or parent, so ones that need either (an
// AccordionItem outside an Accordion, a Select without `items`) throw in both builds. That's
// expected; only the errors below are treated as real SSR bugs.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SSR_BUGS =
  /\b(document|window|navigator|localStorage|requestAnimationFrame) is not defined|does not provide an export/

const entry = `
import { createSSRApp, h, withDirectives } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as vdom from 'vael-ui'
import * as vapor from 'vael-ui/vapor'
export const builds = { vdom, vapor }
export const render = (component) =>
  renderToString(createSSRApp({ render: () => h(component, null, () => 'x') }))
// v-animate's first appearance as CSS, from either build's directive.
export const appear = (lib) =>
  renderToString(
    createSSRApp({
      render: () => withDirectives(h('p', 'x'), [[lib.vAnimate, { initial: { opacity: 0 } }]]),
    }),
  )
`

console.warn = () => {}
const vite = await createServer({
  root: join(__dirname, '..'),
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  plugins: [
    {
      name: 'verify-ssr-entry',
      resolveId: (id) => (id === 'virtual:verify-ssr' ? '\0virtual:verify-ssr' : undefined),
      load: (id) => (id === '\0virtual:verify-ssr' ? entry : undefined),
    },
  ],
})

const problems = []
const rendered = {}
try {
  const { builds, render, appear } = await vite.ssrLoadModule('virtual:verify-ssr')
  for (const [label, lib] of Object.entries(builds))
    if (!(await appear(lib)).includes('data-ui-appear'))
      problems.push(`${label} v-animate renders no first-paint appearance on the server`)
  for (const [label, lib] of Object.entries(builds)) {
    rendered[label] = new Set()
    const components = Object.keys(lib).filter(
      (name) => /^[A-Z]/.test(name) && typeof lib[name] === 'object' && 'setup' in lib[name],
    )
    for (const name of components) {
      try {
        await render(lib[name])
        rendered[label].add(name)
      } catch (error) {
        const message = String(error?.message ?? error).split('\n')[0]
        if (SSR_BUGS.test(message)) problems.push(`${label} ${name}: ${message}`)
      }
    }
  }
  for (const [a, b] of [
    ['vdom', 'vapor'],
    ['vapor', 'vdom'],
  ]) {
    for (const name of rendered[a]) {
      if (!rendered[b].has(name)) problems.push(`${name} renders in ${a} but not in ${b}`)
    }
  }
} catch (error) {
  problems.push(
    `a build failed to load on the server: ${String(error?.message ?? error).split('\n')[0]}`,
  )
} finally {
  await vite.close()
}

// An SSR app with the `vapor` condition on its server imports 'vael-ui' and must get the Vapor
// server build, not the browser one (which throws "does not provide an export" on the server).
const vaporConditionEntry = `
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Button } from 'vael-ui'
export const html = () => renderToString(createSSRApp({ render: () => h(Button, null, () => 'x') }))
`
const vaporVite = await createServer({
  root: join(__dirname, '..'),
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  ssr: {
    noExternal: ['vael-ui'],
    resolve: { conditions: ['vapor', 'module', 'node', 'development|production'] },
  },
  plugins: [
    {
      name: 'verify-ssr-vapor-condition',
      resolveId: (id) =>
        id === 'virtual:verify-ssr-vapor' ? '\0virtual:verify-ssr-vapor' : undefined,
      load: (id) => (id === '\0virtual:verify-ssr-vapor' ? vaporConditionEntry : undefined),
    },
  ],
})
try {
  const { html } = await vaporVite.ssrLoadModule('virtual:verify-ssr-vapor')
  if (!(await html()).includes('ui-button'))
    problems.push("'vael-ui' with the vapor condition rendered no Button")
} catch (error) {
  problems.push(
    `'vael-ui' with the vapor condition failed on the server: ${String(error?.message ?? error).split('\n')[0]}`,
  )
} finally {
  await vaporVite.close()
}

if (problems.length) {
  console.error(`SSR check failed:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(
  `OK: ${rendered.vdom.size} components server-render in vael-ui and vael-ui/vapor alike, and with the vapor condition.`,
)
