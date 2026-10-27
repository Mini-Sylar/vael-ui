#!/usr/bin/env node
// Each component's parts and the classes each one carries, read from its source: every part is
// resolved as `resolveUiPart(cx, themedUi()?.part, 'ui-…')`, some in more than one place
// (Pagination's `button` is its arrows and its page numbers), and where each slot's content lands.
// The docs' anatomy view finds them in a live demo by these classes, so it can't drift.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const COMPONENTS = join(here, '../../packages/ui/src/components')
const OUT = join(here, '../src/generated/anatomy.json')

// `themedUi()?.part` in a component, `props.ui?.part` in a piece it hands its `ui` to.
const PART = /resolveUiPart\(\s*cx,\s*(?:themedUi\(\)|props\.ui)\?\.(\w+),\s*'([\w-]+)'/g
const anatomy = {}
const wraps = new Map()
const add = (parts, part, classes) =>
  (parts[part] = [...new Set([...(parts[part] ?? []), ...classes])])
const partsIn = (source) => {
  const parts = {}
  for (const [, part, cls] of source.matchAll(PART)) add(parts, part, [cls])
  return parts
}
// Shared pieces (Select's and Combobox's option list) style with the `ui` their component passes.
const shared = Object.fromEntries(
  readdirSync(join(COMPONENTS, 'internal'))
    .filter((f) => f.endsWith('.vue'))
    .map((f) => [f.slice(0, -4), partsIn(readFileSync(join(COMPONENTS, 'internal', f), 'utf8'))]),
)
// Component folders are capitalised; `internal` and `shared` hold pieces, not components.
for (const folder of readdirSync(COMPONENTS)
  .sort()
  .filter((f) => /^[A-Z]/.test(f))) {
  // The component and its own pieces (DataTable's head and body rows), all its parts.
  let files
  try {
    files = readdirSync(join(COMPONENTS, folder)).filter((f) => f.endsWith('.vue'))
  } catch {
    continue
  }
  const parts = {}
  for (const file of files.sort((a, b) =>
    a === `${folder}.vue` ? -1 : b === `${folder}.vue` ? 1 : 0,
  )) {
    const source = readFileSync(join(COMPONENTS, folder, file), 'utf8')
    for (const [part, classes] of Object.entries(partsIn(source))) add(parts, part, classes)
    for (const [, tag] of source.matchAll(/<([A-Z]\w+)[\s>]/g))
      for (const [part, classes] of Object.entries(shared[tag] ?? {})) add(parts, part, classes)
  }
  if (Object.keys(parts).length) anatomy[folder] = parts
  else
    wraps.set(
      folder,
      files.map((f) => readFileSync(join(COMPONENTS, folder, f), 'utf8')).join('\n'),
    )
}
// One with no parts of its own is the components it renders (Drawer is a Dialog, Tour a Popover).
for (const [folder, source] of wraps) {
  const parts = {}
  for (const [, tag] of source.matchAll(/<([A-Z]\w+)[\s>]/g))
    for (const [part, classes] of Object.entries(anatomy[tag] ?? {})) add(parts, part, classes)
  if (Object.keys(parts).length) anatomy[folder] = parts
}

// Where each slot's content lands: the nearest element around its <slot> that carries a part (or a
// ui- class), or, when the slot is handed on to another component, wherever that one puts it.
const TAG = /<(\/?)([A-Za-z][\w.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
const VOID = /^(input|img|br|hr|col|area|meta|link|source|wbr)$/
const PASS_THROUGH = /^(Transition|TransitionGroup|Teleport|KeepAlive|Suspense|component)$/
function slotsIn(source, parts) {
  const template = source.match(/^<template>([\s\S]*)^<\/template>/m)?.[1] ?? ''
  const keyOf = {}
  for (const [, name, key] of source.matchAll(
    /const (\w+) = computed\(\(\)\s*=>\s*resolveUiPart\(\s*cx,\s*(?:themedUi\(\)|props\.ui)\?\.(\w+)/g,
  ))
    keyOf[name] = key
  const out = {}
  const stack = []
  for (const [, close, tag, attrs, self] of template
    .replace(/<!--[\s\S]*?-->/g, '')
    .matchAll(TAG)) {
    if (close) {
      const at = stack.findLastIndex((el) => el.tag === tag)
      if (at >= 0) stack.length = at
      continue
    }
    if (tag === 'slot') {
      const name = attrs.match(/\bname="([\w-]+)"/)?.[1] ?? 'default'
      out[name] ??= { classes: [], forward: [] }
      const found = landing(stack, parts, keyOf)
      if (found?.classes) out[name].classes.push(...found.classes)
      else if (found?.forward) out[name].forward.push(found.forward)
    }
    if (!self && !VOID.test(tag)) stack.push({ tag, attrs })
  }
  return out
}
function landing(stack, parts, keyOf) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const { tag, attrs } = stack[i]
    if (tag === 'slot' || PASS_THROUGH.test(tag)) continue
    if (tag === 'template') {
      const into = attrs.match(/(?:^|\s)(?:#|v-slot:)([\w-]+)/)?.[1]
      const owner = stack[i - 1]?.tag
      if (into && owner && /^[A-Z]/.test(owner)) return { forward: [owner, into] }
      continue
    }
    if (/^[A-Z]/.test(tag)) return { forward: [tag, 'default'] }
    const part = attrs.match(/:class="[^"]*?\b(\w+)\.class/)?.[1]
    if (part && keyOf[part] && parts[keyOf[part]]) return { classes: parts[keyOf[part]] }
    // Its own class, not a modifier (`ui-tree-row`, not `ui-tree-row--sticky`).
    const literal = [...attrs.matchAll(/(?:^|[\s'"])(ui-[\w-]+)/g)]
      .map((m) => m[1])
      .find((cls) => !cls.includes('--'))
    if (literal) return { classes: [literal] }
  }
  return null
}
const slotTable = {}
const sourcesOf = (dir) => {
  try {
    return readdirSync(join(COMPONENTS, dir))
      .filter((f) => f.endsWith('.vue'))
      .map((f) => [f.slice(0, -4), readFileSync(join(COMPONENTS, dir, f), 'utf8')])
  } catch {
    return []
  }
}
for (const folder of readdirSync(COMPONENTS).filter((f) => /^[A-Z]/.test(f) || f === 'internal'))
  for (const [file, source] of sourcesOf(folder)) {
    const own = folder === 'internal' ? {} : (anatomy[folder] ?? {})
    const parts = Object.assign({}, own, partsIn(source))
    slotTable[folder === 'internal' || file !== folder ? file : folder] = slotsIn(source, parts)
  }
function classesOf(component, slot, seen = new Set()) {
  const entry = slotTable[component]?.[slot]
  if (!entry || seen.has(`${component}#${slot}`)) return []
  seen.add(`${component}#${slot}`)
  return [
    ...new Set([...entry.classes, ...entry.forward.flatMap(([c, s]) => classesOf(c, s, seen))]),
  ]
}

const out = {}
for (const [component, parts] of Object.entries(anatomy)) {
  const slots = {}
  for (const slot of Object.keys(slotTable[component] ?? {})) {
    const classes = classesOf(component, slot)
    if (classes.length) slots[slot] = classes
  }
  out[component] = { parts, slots }
}
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`)
console.log(`wrote ${OUT} (${Object.keys(out).length} components)`)
