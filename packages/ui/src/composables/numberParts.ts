/** @internal A number split into keyed characters for AnimatedNumber. */
export interface NumberPart {
  /** Stable across values: integer digits by place value, fraction digits by position. */
  key: string
  kind: 'digit' | 'symbol'
  text: string
  /** 0–9 for a digit. */
  digit: number
}

/** @internal The digits 0–9 in the formatter's numbering system. */
export function digitGlyphs(formatter: Intl.NumberFormat): string[] {
  const { locale, numberingSystem } = formatter.resolvedOptions()
  const plain = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false })
  return Array.from({ length: 10 }, (_, digit) => plain.format(digit))
}

/** @internal `value` formatted and split into keyed characters, so a changed digit keeps its element. */
export function numberParts(
  formatter: Intl.NumberFormat,
  value: number,
  glyphs: string[],
): NumberPart[] {
  const parts = formatter.formatToParts(value)
  const integerDigits = parts
    .filter((part) => part.type === 'integer')
    .reduce((count, part) => count + [...part.value].length, 0)
  const out: NumberPart[] = []
  const seen: Record<string, number> = {}
  let integerSeen = 0
  let fractionSeen = 0
  for (const part of parts) {
    if (part.type === 'integer' || part.type === 'fraction') {
      for (const char of part.value) {
        const key =
          part.type === 'integer' ? `i${integerDigits - ++integerSeen}` : `f${fractionSeen++}`
        const digit = glyphs.indexOf(char)
        out.push(
          digit < 0
            ? { key, kind: 'symbol', text: char, digit: 0 }
            : { key, kind: 'digit', text: char, digit },
        )
      }
    } else if (part.type === 'group') {
      out.push({
        key: `g${integerDigits - integerSeen}`,
        kind: 'symbol',
        text: part.value,
        digit: 0,
      })
    } else {
      seen[part.type] = (seen[part.type] ?? 0) + 1
      out.push({
        key: `${part.type}${seen[part.type]}`,
        kind: 'symbol',
        text: part.value,
        digit: 0,
      })
    }
  }
  return out
}

const RTL_CHARS = /[֐-ࣿיִ-﷿ﹰ-ﻼ‏؜]/

/** @internal `parts` left to right as the browser shows their text, since separate boxes lose bidi ordering. */
export function visualOrder(parts: NumberPart[], direction: string): NumberPart[] {
  const text = parts.map((part) => part.text).join('')
  if (typeof document === 'undefined' || (direction !== 'rtl' && !RTL_CHARS.test(text)))
    return parts
  const probe = document.createElement('span')
  probe.dir = direction
  probe.style.cssText = 'position:absolute;inset:0 auto auto 0;visibility:hidden;white-space:pre'
  probe.textContent = text
  document.body.append(probe)
  const range = document.createRange()
  let offset = 0
  const placed = parts.map((part) => {
    range.setStart(probe.firstChild!, offset)
    offset += part.text.length
    range.setEnd(probe.firstChild!, offset)
    return { part, x: range.getBoundingClientRect().left }
  })
  probe.remove()
  return placed.sort((a, b) => a.x - b.x).map(({ part }) => part)
}
