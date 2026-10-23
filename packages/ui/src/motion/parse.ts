// parseMotionStyle: a style from outside your code (a settings page, a database, the network) in, a
// safe data-only style out. Unknown keys, functions and out-of-range or unsafe values are dropped
// one by one and reported; it never throws.
import type { MotionStyle, ParseMotionStyle } from './types'
import { motionWarn } from './warn'

type Data = Record<string, unknown>
type Issues = string[]

const isData = (value: unknown): value is Data =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const NAME = /^[a-z][\w-]{0,31}$/i
const UNSAFE = /url\(|[{};<>]|\/\*|\\|expression\(/i

const ROLES = ['overlay', 'list', 'reveal', 'press', 'content'] as const
const COMPONENTS = [
  'dialog',
  'popover',
  'menu',
  'toaster',
  'tabs',
  'input',
  'otpInput',
  'calendar',
  'fileUpload',
  'commandPalette',
  'speedDial',
  'dataTable',
  'select',
  'combobox',
  'cascadeSelect',
  'datePicker',
  'tooltip',
  'message',
  'treeSelect',
  'timeline',
  'button',
  'accordion',
  'slider',
  'animatedNumber',
  'animatedText',
  'avatar',
  'avatarGroup',
  'badge',
  'breadcrumb',
  'buttonGroup',
  'card',
  'checkbox',
  'chip',
  'collapsible',
  'dial',
  'dock',
  'editable',
  'field',
  'inputNumber',
  'kbd',
  'knob',
  'loader',
  'passwordInput',
  'progress',
  'pullToRefresh',
  'radio',
  'radioGroup',
  'rating',
  'resizable',
  'scrollArea',
  'skeleton',
  'sortable',
  'stepper',
  'swipeToReveal',
  'switch',
  'tag',
  'textarea',
  'tree',
  'menuList',
  'pagination',
  'selectButton',
  'toolbar',
  'colorPicker',
  'separator',
] as const
// Every component key in MotionStyle, so a style for one is never dropped as unknown.
type ComponentKey = Exclude<
  keyof MotionStyle,
  'version' | 'spring' | 'engine' | 'filters' | 'presets' | (typeof ROLES)[number]
>
type Unlisted = Exclude<ComponentKey, (typeof COMPONENTS)[number]>
const everyComponent: [Unlisted] extends [never] ? true : Unlisted = true
void everyComponent

// Animatable properties a shared style may set: paint and transform, never layout.
const PROPERTIES = new Set([
  'x',
  'y',
  'blur',
  'opacity',
  'scale',
  'rotate',
  'translate',
  'transform',
  'transformOrigin',
  'filter',
  'backdropFilter',
  'clipPath',
  'color',
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'outlineColor',
  'letterSpacing',
])
const EASING_TOKEN = /^var\(--ui-ease-[a-z-]+\)$/
const DURATION_TOKEN = /^var\(--ui-duration-[a-z-]+\)$/
const cssName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

/** Copies only the listed keys, dropping (and reporting) the rest. */
function entries(input: Data, path: string, issues: Issues): [string, unknown][] {
  const out: [string, unknown][] = []
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.has(key)) issues.push(`${path}.${key}: not allowed`)
    else if (typeof value === 'function') issues.push(`${path}.${key}: functions only live in code`)
    else out.push([key, value])
  }
  return out
}

function spring(input: unknown, path: string, issues: Issues): Data | undefined {
  if (!isData(input)) return void issues.push(`${path}: expected { damping, response }`)
  if (!inRange(input.damping, 0, 2) || !inRange(input.response, 0.05, 2))
    return void issues.push(`${path}: damping 0–2 and response 0.05–2 seconds`)
  return { damping: input.damping, response: input.response }
}

function easing(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 400 || UNSAFE.test(value)) return false
  if (EASING_TOKEN.test(value)) return true
  return typeof CSS === 'undefined' || CSS.supports('transition-timing-function', value)
}

/** spring XOR duration + easing, copied onto `out`. */
function timing(input: Data, out: Data, path: string, issues: Issues): void {
  if (input.spring !== undefined) {
    const parsed = spring(input.spring, `${path}.spring`, issues)
    if (parsed) out.spring = parsed
  }
  if (input.duration !== undefined) {
    const d = input.duration
    if (inRange(d, 0, 2000) || (typeof d === 'string' && DURATION_TOKEN.test(d))) out.duration = d
    else issues.push(`${path}.duration: up to 2000ms, or a --ui-duration token`)
  }
  if (input.easing !== undefined) {
    if (easing(input.easing)) out.easing = input.easing
    else issues.push(`${path}.easing: not a CSS easing`)
  }
  if (out.spring && (out.duration !== undefined || out.easing !== undefined)) {
    issues.push(`${path}: spring, or duration with easing, not both; kept the spring`)
    delete out.duration
    delete out.easing
  }
}

function cssValue(key: string, value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= 10000
  if (typeof value !== 'string' || value.length > 200 || UNSAFE.test(value)) return false
  if (key === 'x' || key === 'y' || key === 'blur')
    return typeof CSS === 'undefined' || CSS.supports('width', value)
  return typeof CSS === 'undefined' || CSS.supports(cssName(key), value)
}

function values(input: unknown, path: string, issues: Issues): Data | undefined {
  if (!isData(input)) return void issues.push(`${path}: expected values`)
  const out: Data = {}
  for (const [key, raw] of entries(input, path, issues)) {
    if (!PROPERTIES.has(key)) {
      issues.push(`${path}.${key}: not an animatable property a style may set`)
      continue
    }
    const check = (v: unknown) =>
      Array.isArray(v)
        ? v.length > 0 && v.length <= 12 && v.every((x) => cssValue(key, x))
        : cssValue(key, v)
    if (isData(raw)) {
      // { value, …timing, delay }: one value with its own timing.
      if (!check(raw.value)) {
        issues.push(`${path}.${key}.value: not a valid ${key}`)
        continue
      }
      const timed: Data = { value: raw.value }
      timing(raw, timed, `${path}.${key}`, issues)
      if (raw.delay !== undefined) {
        if (inRange(raw.delay, 0, 2)) timed.delay = raw.delay
        else issues.push(`${path}.${key}.delay: 0–2 seconds`)
      }
      out[key] = timed
    } else if (check(raw)) out[key] = raw
    else issues.push(`${path}.${key}: not a valid ${key}`)
  }
  return out
}

function moment(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[a-z][\w-]{0,31}(:(start|settle|\d{1,3}(\.\d+)?%))?$/i.test(value)
  )
}

function target(input: unknown, path: string, issues: Issues): Data | undefined {
  if (!isData(input)) return void issues.push(`${path}: expected a target`)
  const out: Data = {}
  timing(input, out, path, issues)
  for (const [key, raw] of entries(input, path, issues)) {
    if (['spring', 'duration', 'easing'].includes(key)) continue
    if (key === 'initial' || key === 'exit') {
      const parsed = values(raw, `${path}.${key}`, issues)
      if (parsed) out[key] = parsed
    } else if (key === 'stagger') {
      if (inRange(raw, 0, 1)) out.stagger = raw
      else issues.push(`${path}.stagger: 0–1 seconds`)
    } else if (key === 'delay') {
      if (inRange(raw, -2, 2)) out.delay = raw
      else issues.push(`${path}.delay: -2–2 seconds`)
    } else if (key === 'after') {
      const list = Array.isArray(raw) ? raw : [raw]
      if (list.length <= 8 && list.every(moment)) out.after = raw
      else issues.push(`${path}.after: names or moments like 'rows:60%'`)
    } else if (key === 'select' || key === 'slot') {
      // Scoped querySelectorAll inside the component; still, keep it a plain selector.
      if (typeof raw === 'string' && raw.length <= 100 && !UNSAFE.test(raw)) out[key] = raw
      else issues.push(`${path}.${key}: a short selector`)
    } else if (key === 'steps') {
      if (!Array.isArray(raw) || raw.length > 8) {
        issues.push(`${path}.steps: up to 8 steps`)
        continue
      }
      out.steps = raw.flatMap((step, i) => {
        const at = `${path}.steps[${i}]`
        if (!isData(step)) {
          issues.push(`${at}: expected a step`)
          return []
        }
        const parsed: Data = {}
        timing(step, parsed, at, issues)
        if (step.to !== undefined) {
          const to = values(step.to, `${at}.to`, issues)
          if (to) parsed.to = to
        }
        if (step.after !== undefined && moment(step.after)) parsed.after = step.after
        if (step.delay !== undefined && inRange(step.delay, -2, 2)) parsed.delay = step.delay
        return [parsed]
      })
    } else issues.push(`${path}.${key}: unknown`)
  }
  return out
}

function parts(input: unknown, path: string, issues: Issues): Data | undefined {
  if (!isData(input)) return void issues.push(`${path}: expected values per part`)
  const out: Data = {}
  for (const [part, raw] of entries(input, path, issues)) {
    if (!NAME.test(part)) issues.push(`${path}.${part}: not a part name`)
    else {
      const parsed = values(raw, `${path}.${part}`, issues)
      if (parsed) out[part] = parsed
    }
  }
  return out
}

function component(input: unknown, path: string, issues: Issues): Data | undefined {
  if (!isData(input)) return void issues.push(`${path}: expected an object`)
  const out: Data = {}
  timing(input, out, path, issues)
  for (const [key, raw] of entries(input, path, issues)) {
    if (['spring', 'duration', 'easing'].includes(key)) continue
    if (key === 'initial' || key === 'exit') {
      const parsed = parts(raw, `${path}.${key}`, issues)
      if (parsed) out[key] = parsed
    } else if (key === 'targets') {
      if (!isData(raw)) issues.push(`${path}.targets: expected targets by name`)
      else {
        const targets: Data = {}
        for (const [name, value] of entries(raw, `${path}.targets`, issues)) {
          if (!NAME.test(name)) issues.push(`${path}.targets.${name}: not a name`)
          else {
            const parsed = target(value, `${path}.targets.${name}`, issues)
            if (parsed) targets[name] = parsed
          }
        }
        out.targets = targets
      }
    } else if (key === 'states') {
      if (!isData(raw)) issues.push(`${path}.states: expected states by name`)
      else {
        const states: Data = {}
        for (const [name, value] of entries(raw, `${path}.states`, issues)) {
          const parsed = parts(value, `${path}.states.${name}`, issues)
          if (parsed) states[name] = parsed
        }
        out.states = states
      }
    } else if (key === 'chips' || key === 'items') {
      const parsed = component(raw, `${path}.${key}`, issues)
      if (parsed) out[key] = parsed
    } else if (key === 'resize' && typeof raw === 'boolean') out.resize = raw
    else if (key === 'swap' && (raw === 'sync' || raw === 'wait')) out.swap = raw
    else if (key === 'when' && (raw === 'mount' || raw === 'visible')) out.when = raw
    else if (key === 'morph' && raw === 'trigger') out.morph = raw
    else if (key === 'exitOrder' && (raw === 'together' || raw === 'reverse')) out.exitOrder = raw
    else if (key === 'stagger' && inRange(raw, 0, 1)) out.stagger = raw
    else if (key === 'leaving' && (raw === 'pop' || raw === 'hold')) out.leaving = raw
    else issues.push(`${path}.${key}: unknown or invalid`)
  }
  return out
}

function role(name: (typeof ROLES)[number], input: unknown, issues: Issues): Data | undefined {
  const path = name
  if (name === 'content') return target(input, path, issues)
  if (!isData(input)) return void issues.push(`${path}: expected an object`)
  const out: Data = {}
  timing(input, out, path, issues)
  for (const [key, raw] of entries(input, path, issues)) {
    if (['spring', 'duration', 'easing'].includes(key)) continue
    const valuesKey =
      ((name === 'overlay' || name === 'list' || name === 'reveal') &&
        (key === 'initial' || key === 'exit')) ||
      (name === 'overlay' && key === 'surface') ||
      (name === 'press' && (key === 'active' || key === 'hover'))
    if (valuesKey) {
      const parsed = values(raw, `${path}.${key}`, issues)
      if (parsed) out[key] = parsed
    } else if (name === 'overlay' && key === 'morph' && raw === 'trigger') out.morph = raw
    else if (
      name === 'overlay' &&
      key === 'morph' &&
      isData(raw) &&
      raw.from === 'trigger' &&
      Object.keys(raw).every((k) => k === 'from' || k === 'hide') &&
      (raw.hide === undefined || typeof raw.hide === 'boolean')
    )
      out.morph = { from: 'trigger', ...(raw.hide === undefined ? {} : { hide: raw.hide }) }
    else if (name === 'overlay' && key === 'exitOrder' && (raw === 'together' || raw === 'reverse'))
      out.exitOrder = raw
    else if (name === 'overlay' && key === 'swap' && (raw === 'sync' || raw === 'wait'))
      out.swap = raw
    else if (name === 'overlay' && key === 'resize' && typeof raw === 'boolean') out.resize = raw
    else if (name === 'list' && key === 'stagger' && inRange(raw, 0, 1)) out.stagger = raw
    else if (name === 'list' && key === 'leaving' && (raw === 'pop' || raw === 'hold'))
      out.leaving = raw
    else if (name === 'list' && key === 'appear' && typeof raw === 'boolean') out.appear = raw
    else issues.push(`${path}.${key}: unknown or invalid`)
  }
  return out
}

/** Validates a style from outside your code. Unsafe or unknown parts are dropped and listed in `issues`. */
export const parseMotionStyle: ParseMotionStyle = (input) => {
  const issues: Issues = []
  const style: Data = { version: 1 }
  if (!isData(input) || input.version !== 1) {
    issues.push('not a motion style: expected an object with version: 1')
  } else {
    for (const [key, raw] of entries(input, 'style', issues)) {
      if (key === 'version') continue
      if (key === 'spring') {
        const parsed = spring(raw, 'spring', issues)
        if (parsed) style.spring = parsed
      } else if (key === 'filters') {
        if (!isData(raw)) {
          issues.push('filters: expected filters by name')
          continue
        }
        const filters: Data = {}
        for (const [name, filter] of entries(raw, 'filters', issues)) {
          if (!NAME.test(name) || !isData(filter)) {
            issues.push(`filters.${name}: a name and { blur, contrast }`)
            continue
          }
          const parsed: Data = {}
          if (filter.blur !== undefined) {
            if (inRange(filter.blur, 0, 50)) parsed.blur = filter.blur
            else issues.push(`filters.${name}.blur: 0–50`)
          }
          if (filter.contrast !== undefined) {
            const c = filter.contrast
            if (
              Array.isArray(c) &&
              c.length === 2 &&
              inRange(c[0], -100, 100) &&
              inRange(c[1], -100, 100)
            )
              parsed.contrast = [c[0], c[1]]
            else issues.push(`filters.${name}.contrast: [multiplier, offset] within ±100`)
          }
          for (const extra of Object.keys(filter))
            if (extra !== 'blur' && extra !== 'contrast')
              issues.push(`filters.${name}.${extra}: unknown`)
          filters[name] = parsed
        }
        style.filters = filters
      } else if (key === 'presets') {
        if (!isData(raw)) {
          issues.push('presets: expected presets by name')
          continue
        }
        const presets: Data = {}
        for (const [name, preset] of entries(raw, 'presets', issues)) {
          if (!NAME.test(name)) issues.push(`presets.${name}: not a name`)
          else {
            const parsed = target(preset, `presets.${name}`, issues)
            if (parsed) presets[name] = parsed
          }
        }
        style.presets = presets
      } else if ((ROLES as readonly string[]).includes(key)) {
        const parsed = role(key as (typeof ROLES)[number], raw, issues)
        if (parsed) style[key] = parsed
      } else if ((COMPONENTS as readonly string[]).includes(key)) {
        const parsed = component(raw, key, issues)
        if (parsed) style[key] = parsed
      } else issues.push(`${key}: unknown`)
    }
  }
  if (issues.length)
    if (process.env.NODE_ENV !== 'production')
      motionWarn(`parseMotionStyle dropped what it couldn't trust:\n  ${issues.join('\n  ')}`)
  return { style: style as unknown as MotionStyle, issues }
}
