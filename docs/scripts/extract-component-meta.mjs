#!/usr/bin/env node
// Statically extracts props/events/slots/exposed for every public component
// straight from packages/ui/src/components/*.vue via vue-component-meta, so
// the docs site's API tables can never drift from the real source.

import { createChecker } from 'vue-component-meta'
import ts from 'typescript'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TSCONFIG_PATH = join(__dirname, '../../packages/ui/tsconfig.json')
const UI_INDEX_PATH = join(__dirname, '../../packages/ui/src/index.ts')
const UI_COMPONENTS_DIR = join(__dirname, '../../packages/ui/src/components')
const OUT_PATH = join(__dirname, '../src/generated/component-meta.json')

function collectPublicComponents(indexSource) {
  const names = []
  const re = /export\s*\{\s*default\s+as\s+(\w+)[^}]*\}\s*from\s*'\.\/components\/([^']+)\.vue'/g
  let match
  while ((match = re.exec(indexSource))) {
    names.push({ exportName: match[1], relativePath: match[2] })
  }
  return names
}

// Keeps exactly one level of nesting — enough for the playground's control
// inference (an enum's own members) — and no more. Recursive generic types
// in this codebase (MenuEntry's nested `items`, TreeNode, ...) expand to
// unbounded depth under `schema: true` otherwise, which blew JSON.stringify
// past Node's max string length on the very first attempt.
function shallowSchema(schema, depth = 0) {
  if (typeof schema !== 'object' || schema === null) return schema
  if (depth >= 1) return schema.type ?? null
  return {
    kind: schema.kind,
    type: schema.type,
    // oxfmt-ignore
    schema: Array.isArray(schema.schema) ? schema.schema.map((s) => shallowSchema(s, depth + 1)) : undefined,
  }
}

// Every prop with a runtime default carries a matching `@default` tag, since
// that tag is the only place the default survives into the published
// `.d.ts` (editor hovers can't see `withDefaults`). The tag's text also reads
// the way the source is written (`'md'`, `(item, index) => index`), so the
// docs show it as `defaultText`; `default` keeps vue-component-meta's
// JSON-style value, which the playground parses.
function defaultTag(prop) {
  return prop.tags?.find((tag) => tag.name === 'default')?.text?.trim()
}

// Loose equality between a `@default` tag and vue-component-meta's printed
// default: ignores quote style, whitespace and `as` casts, and compares a
// function default by its body (vue-component-meta unwraps arrows).
function sameDefault(tag, printed) {
  const normalize = (value) =>
    value
      .replace(/^\(.*?\)\s*=>\s*/, '')
      .replace(/\s+as\s+\w+$/, '')
      .replace(/'/g, '"')
      .replace(/\s+/g, '')
  return normalize(tag) === normalize(printed)
}

function defaultProblem(prop) {
  const tag = defaultTag(prop)
  const hasRuntimeDefault = prop.default !== undefined && prop.default !== 'undefined'
  if (hasRuntimeDefault && !tag)
    return `prop \`${prop.name}\` defaults to ${prop.default} but has no @default tag`
  if (hasRuntimeDefault && !sameDefault(tag, prop.default)) {
    return `prop \`${prop.name}\`: @default ${tag} doesn't match the real default ${prop.default}`
  }
  return null
}

function toPlainProp(prop) {
  return {
    name: prop.name,
    description: prop.description,
    type: prop.type,
    // Machine-readable (JSON-ish), for the playground's control defaults.
    default: prop.default,
    // As written in source, for the API tables and skill references.
    defaultText: defaultTag(prop) ?? prop.default,
    required: prop.required,
    global: prop.global,
    schema: shallowSchema(prop.schema),
  }
}

function toPlainEventOrSlot(entry) {
  return {
    name: entry.name,
    description: entry.description,
    type: entry.type,
  }
}

function formatType(typeChecker, type) {
  return typeChecker
    .typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.UseFullyQualifiedType | ts.TypeFormatFlags.NoTruncation,
    )
    .replace(/import\(.*?\)\./g, '')
}

function findNode(root, predicate) {
  let found
  const visit = (node) => {
    if (found) return
    if (predicate(node)) found = node
    else ts.forEachChild(node, visit)
  }
  visit(root)
  return found
}

// Mirrors Vue's `ShallowUnwrapRef`: a template ref reads as its `.value`
// type, everything else stays as is.
function unwrapRef(typeChecker, type) {
  const isRef = type.getProperties().some((p) => p.getName().includes('RefSymbol'))
  const value = isRef && type.getProperty('value')
  return value ? typeChecker.getTypeOfSymbol(value) : type
}

// vue-component-meta's own `exposed` is wrong in two ways here:
// - It's always empty for a generic (`<script setup generic="T">`)
//   component. Vue types that component's `expose` parameter as optional,
//   and upstream's `inferComponentExposed` asks the `| undefined` union for
//   call signatures without stripping it, so it finds none.
// - It drops any exposed member that shares a prop's name (Button's
//   `loading`, e.g.), since it filters the instance type by prop names.
// Vue's codegen assigns the `defineExpose({...})` argument to a
// `__VLS_exposed` const in every component's virtual file, so reading that
// object directly sidesteps both.
function resolveExposed(program, sourceFile) {
  const decl = findNode(
    sourceFile,
    (n) =>
      ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === '__VLS_exposed',
  )
  if (!decl) return []
  const typeChecker = program.getTypeChecker()
  return typeChecker
    .getTypeAtLocation(decl)
    .getProperties()
    .map((prop) => ({
      name: prop.getName(),
      description: ts.displayPartsToString(prop.getDocumentationComment(typeChecker)),
      type: formatType(typeChecker, unwrapRef(typeChecker, typeChecker.getTypeOfSymbol(prop))),
    }))
}

// Vue turns `defineEmits<{ name: [...] }>()` into overloaded call
// signatures that don't carry the JSDoc written on each key, so
// vue-component-meta always reports an empty event description. Reads it
// back off the type literal passed to `defineEmits` instead.
function resolveEventDescriptions(program, sourceFile) {
  const call = findNode(
    sourceFile,
    (n) =>
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'defineEmits' &&
      n.typeArguments?.length === 1,
  )
  if (!call) return new Map()
  const typeChecker = program.getTypeChecker()
  return new Map(
    typeChecker
      .getTypeFromTypeNode(call.typeArguments[0])
      .getProperties()
      .map((prop) => [
        prop.getName(),
        ts.displayPartsToString(prop.getDocumentationComment(typeChecker)),
      ]),
  )
}

// `update:*` events generated by `defineModel` have no declaration to hang a
// JSDoc on, so they get a uniform description pointing back at the model.
function modelEventDescription(eventName) {
  if (!eventName.startsWith('update:')) return ''
  const model = eventName.slice('update:'.length)
  return model === 'modelValue'
    ? 'Fires when `modelValue` changes (`v-model`).'
    : `Fires when \`${model}\` changes (\`v-model:${model}\`).`
}

function main() {
  const indexSource = readFileSync(UI_INDEX_PATH, 'utf8')
  const components = collectPublicComponents(indexSource)

  const checker = createChecker(TSCONFIG_PATH, { schema: true })
  const meta = {}
  const errors = []

  for (const { exportName, relativePath } of components) {
    try {
      const filePath = join(UI_COMPONENTS_DIR, `${relativePath}.vue`)
      const componentMeta = checker.getComponentMeta(filePath)
      const program = checker.getProgram()
      const sourceFile = program.getSourceFile(filePath)
      const exposed = resolveExposed(program, sourceFile)
      if (exposed.length === 0 && readFileSync(filePath, 'utf8').includes('defineExpose(')) {
        throw new Error('calls defineExpose() but no exposed members could be resolved')
      }
      const props = componentMeta.props.filter((p) => !p.global)
      const defaultProblems = props.map(defaultProblem).filter(Boolean)
      if (defaultProblems.length > 0) throw new Error(defaultProblems.join('; '))
      const eventDescriptions = resolveEventDescriptions(program, sourceFile)
      meta[exportName] = {
        props: props.map(toPlainProp),
        events: componentMeta.events.map((event) => ({
          ...toPlainEventOrSlot(event),
          description:
            event.description ||
            eventDescriptions.get(event.name) ||
            modelEventDescription(event.name),
        })),
        slots: componentMeta.slots.map(toPlainEventOrSlot),
        exposed,
      }
      console.log(`extracted ${exportName}`)
    } catch (err) {
      errors.push(`${exportName}: ${err.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} component(s) failed:\n`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(meta, null, 2) + '\n')
  console.log(`\nwrote docs/src/generated/component-meta.json (${components.length} component(s))`)
}

main()
