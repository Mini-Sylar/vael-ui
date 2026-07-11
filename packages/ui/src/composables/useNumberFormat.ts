import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export interface UseNumberFormatOptions {
  locale?: MaybeRefOrGetter<string | undefined>
  mode?: MaybeRefOrGetter<'decimal' | 'currency' | 'percent' | undefined>
  currency?: MaybeRefOrGetter<string | undefined>
  minFractionDigits?: MaybeRefOrGetter<number | undefined>
  maxFractionDigits?: MaybeRefOrGetter<number | undefined>
  useGrouping?: MaybeRefOrGetter<boolean | undefined>
  /** Literal affix rendered outside Intl (e.g. a unit label Intl has no
   * concept of) — stripped on parse, concatenated on format. */
  prefix?: MaybeRefOrGetter<string | undefined>
  suffix?: MaybeRefOrGetter<string | undefined>
}

export interface UseNumberFormatReturn {
  /** `null`/`NaN` → `''`. Always the full localized+affixed string. */
  format: (value: number | null) => string
  /** `null` for anything that isn't a complete, unambiguous number — including legal in-progress typing states (use `isPartial` to tell those apart from garbage). */
  parse: (text: string) => number | null
  /** True for legal mid-typing states (`''`, `'-'`, `'1.'`, `'.'`, …) that
   * `parse` correctly returns `null` for but must not be rejected. */
  isPartial: (text: string) => boolean
}

export function useNumberFormat(options: UseNumberFormatOptions = {}): UseNumberFormatReturn {
  const baseOptions = computed<Intl.NumberFormatOptions>(() => {
    const mode = toValue(options.mode) ?? 'decimal'
    const opts: Intl.NumberFormatOptions = {
      style: mode,
      useGrouping: toValue(options.useGrouping) ?? true,
    }
    if (mode === 'currency') opts.currency = toValue(options.currency) ?? 'USD'
    const minFD = toValue(options.minFractionDigits)
    const maxFD = toValue(options.maxFractionDigits)
    if (minFD !== undefined) opts.minimumFractionDigits = minFD
    if (maxFD !== undefined) opts.maximumFractionDigits = maxFD
    return opts
  })

  const locale = computed(() => toValue(options.locale))
  const formatter = computed(() => new Intl.NumberFormat(locale.value, baseOptions.value))
  const structureFormatter = computed(
    () =>
      new Intl.NumberFormat(locale.value, {
        ...baseOptions.value,
        minimumFractionDigits: 1,
        maximumFractionDigits: 6,
      }),
  )

  const structure = computed(() => {
    const nf = structureFormatter.value
    const parts = nf.formatToParts(-1234.56)
    let group = ''
    let decimal = '.'
    let minusSign = '-'
    const literals: string[] = []
    for (const part of parts) {
      if (part.type === 'group') group = part.value
      else if (part.type === 'decimal') decimal = part.value
      else if (part.type === 'minusSign') minusSign = part.value
      else if (
        part.value &&
        (part.type === 'currency' ||
          part.type === 'percentSign' ||
          part.type === 'literal' ||
          part.type === 'unit')
      ) {
        literals.push(part.value)
      }
    }
    // Map locale digit glyphs to ASCII equivalents.
    const digitMap = new Map<string, string>()
    for (let d = 0; d <= 9; d++) {
      const glyph = nf.formatToParts(d).find((p) => p.type === 'integer')?.value?.[0]
      if (glyph) digitMap.set(glyph, String(d))
    }
    return { group, decimal, minusSign, literals, digitMap }
  })

  function translateDigits(text: string, digitMap: Map<string, string>): string {
    return Array.from(text)
      .map((ch) => digitMap.get(ch) ?? ch)
      .join('')
  }

  function stripAffixes(text: string): string {
    let s = text
    const prefix = toValue(options.prefix)
    const suffix = toValue(options.suffix)
    if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length)
    if (suffix && s.endsWith(suffix)) s = s.slice(0, s.length - suffix.length)
    return s
  }

  function format(value: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) return ''
    const prefix = toValue(options.prefix) ?? ''
    const suffix = toValue(options.suffix) ?? ''
    return `${prefix}${formatter.value.format(value)}${suffix}`
  }

  function parse(text: string): number | null {
    const { group, decimal, minusSign, literals, digitMap } = structure.value
    let s = stripAffixes(text.trim())
    if (s === '') return null

    s = translateDigits(s, digitMap)
    for (const literal of literals) {
      if (literal) s = s.split(literal).join('')
    }

    let negative = false
    if (minusSign && s.includes(minusSign)) {
      negative = true
      s = s.split(minusSign).join('')
    }
    // Accept ASCII minus regardless of locale
    if (s.includes('-')) {
      negative = true
      s = s.split('-').join('')
    }

    if (group === '.' && decimal !== '.') {
      // Locale group char is ASCII decimal point (de-DE, etc.): treat single . as decimal
      const parts = s.split('.')
      s = parts.length === 2 && /^\d{1,2}$/.test(parts[1] ?? '') ? parts.join('.') : parts.join('')
    } else if (group) {
      s = s.split(group).join('')
    }
    if (decimal !== '.') s = s.split(decimal).join('.')
    // Safety net: drop stray characters (accepts ASCII digits/. fallback)
    s = s.replace(/[^0-9.]/g, '')
    if (s === '' || s === '.') return null

    let n = Number(s)
    if (Number.isNaN(n)) return null
    if (negative) n = -n
    if ((toValue(options.mode) ?? 'decimal') === 'percent') n = n / 100
    return n
  }

  function isPartial(text: string): boolean {
    const { group, decimal, minusSign, literals, digitMap } = structure.value
    let s = stripAffixes(text.trim())
    if (s === '') return true

    s = translateDigits(s, digitMap)
    for (const literal of literals) {
      if (literal) s = s.split(literal).join('')
    }

    let body = s
    if (minusSign && body.startsWith(minusSign)) body = body.slice(minusSign.length)
    else if (body.startsWith('-')) body = body.slice(1)

    if (group) body = body.split(group).join('')
    if (decimal !== '.') body = body.split(decimal).join('.')

    return /^\d*\.?\d*$/.test(body)
  }

  return { format, parse, isPartial }
}
