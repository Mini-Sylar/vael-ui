import type { PropSchema } from '../types'

export type PlaygroundControl =
  | { kind: 'boolean' }
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'select'; options: string[] }

export function inferControl(schema: PropSchema | undefined): PlaygroundControl | null {
  if (!schema) return null

  // Required prop, no `| undefined`: bare type name instead of an enum wrapper.
  if (typeof schema === 'string') {
    if (schema === 'boolean') return { kind: 'boolean' }
    if (schema === 'string') return { kind: 'string' }
    if (schema === 'number') return { kind: 'number' }
    return null
  }

  if (schema.kind !== 'enum') return null
  // `null` is filtered alongside `undefined` — a `number | null` prop
  // (Progress's `value`, nullable-clearable props in general) should still
  // infer as a plain number control, not fall through to no control at all.
  const members = (schema.schema ?? []).filter(
    (m): m is string => typeof m === 'string' && m !== 'undefined' && m !== 'null',
  )
  if (members.length === 0) return null

  if (members.length <= 2 && members.every((m) => m === 'true' || m === 'false')) {
    return { kind: 'boolean' }
  }
  if (members.length === 1 && members[0] === 'string') return { kind: 'string' }
  if (members.length === 1 && members[0] === 'number') return { kind: 'number' }
  if (members.every((m) => /^".*"$/.test(m))) {
    return { kind: 'select', options: members.map((m) => m.slice(1, -1)) }
  }
  return null
}

export function defaultControlValue(
  control: PlaygroundControl,
  propDefault: string | undefined,
): unknown {
  if (propDefault !== undefined) {
    // Default is literally `undefined`: a deliberate "defer to child" prop
    // (SplitButton's closeOnOutside, Combobox's openOnFocus, ...) whose
    // real behavior is enabled by default.
    if (control.kind === 'boolean' && propDefault === 'undefined') return true

    try {
      const parsed = JSON.parse(propDefault)
      if (control.kind === 'boolean' && typeof parsed === 'boolean') return parsed
      if (control.kind === 'string' && typeof parsed === 'string') return parsed
      if (control.kind === 'number' && typeof parsed === 'number') return parsed
      if (
        control.kind === 'select' &&
        typeof parsed === 'string' &&
        control.options.includes(parsed)
      )
        return parsed
    } catch {
      // Non-JSON default (e.g. a function reference as text), fall through.
    }
  }
  switch (control.kind) {
    case 'boolean':
      return false
    case 'string':
      return ''
    case 'number':
      return 0
    case 'select':
      return control.options[0]
  }
}
