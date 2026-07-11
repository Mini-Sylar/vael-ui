import { expect, test } from 'vitest'
import { useNumberFormat } from '../src/composables/useNumberFormat'

test('en-US: group comma, decimal dot', () => {
  const { format, parse, isPartial } = useNumberFormat({ locale: 'en-US' })
  expect(format(1234.5)).toBe('1,234.5')
  expect(parse('1,234.5')).toBe(1234.5)
  expect(parse('1234.5')).toBe(1234.5)
  expect(isPartial('1,234.')).toBe(true)
  // A trailing decimal point with nothing after it still resolves to the
  // integer value if forced to commit right now (Number('1234.') === 1234)
  // — a legitimate mid-typing state, not garbage.
  expect(parse('1,234.')).toBe(1234)
})

test('de-DE: group dot, decimal comma', () => {
  const { format, parse, isPartial } = useNumberFormat({ locale: 'de-DE' })
  expect(format(1234.5)).toBe('1.234,5')
  expect(parse('1.234,5')).toBe(1234.5)
  // A bare ASCII decimal point is still accepted even though the locale's
  // own group character is also '.' — a real thousands group always trails
  // exactly 3 digits, so this single '.5' can't be one.
  expect(parse('1234.5')).toBe(1234.5)
  expect(isPartial('1.234,')).toBe(true)
})

test('de-DE: an actual 3-digit group is still stripped as grouping, not misread as a decimal', () => {
  const { parse } = useNumberFormat({ locale: 'de-DE' })
  expect(parse('1.234')).toBe(1234)
  expect(parse('12.345.678,9')).toBe(12345678.9)
})

test('ar-EG: Arabic-Indic digits translate both ways', () => {
  const { format, parse } = useNumberFormat({ locale: 'ar-EG', useGrouping: false })
  const formatted = format(123)
  // Real Arabic-Indic glyphs, not ASCII — proves format() actually localized.
  expect(formatted).not.toBe('123')
  expect(parse(formatted)).toBe(123)
  // ASCII digits still parse under a non-Latin locale.
  expect(parse('123')).toBe(123)
})

test('negative numbers round-trip in every locale', () => {
  for (const locale of ['en-US', 'de-DE', 'ar-EG']) {
    const { format, parse } = useNumberFormat({ locale })
    const formatted = format(-42.5)
    expect(parse(formatted)).toBe(-42.5)
  }
  const { parse } = useNumberFormat({ locale: 'en-US' })
  expect(parse('-42.5')).toBe(-42.5)
})

test('currency mode formats and parses through the currency literal', () => {
  const { format, parse } = useNumberFormat({
    locale: 'en-US',
    mode: 'currency',
    currency: 'USD',
  })
  const formatted = format(19.99)
  expect(formatted).toContain('19.99')
  expect(parse(formatted)).toBe(19.99)
  expect(parse('19.99')).toBe(19.99)
})

test('percent mode: model is the fraction, display is the multiplied percent', () => {
  const { format, parse } = useNumberFormat({ locale: 'en-US', mode: 'percent' })
  expect(format(0.5)).toBe('50%')
  expect(parse('50%')).toBe(0.5)
  expect(parse('50')).toBe(0.5)
})

test('prefix/suffix are literal affixes stripped on parse, concatenated on format', () => {
  const { format, parse } = useNumberFormat({ locale: 'en-US', prefix: '~', suffix: ' units' })
  expect(format(5)).toBe('~5 units')
  expect(parse('~5 units')).toBe(5)
  expect(parse('5')).toBe(5)
})

test('isPartial accepts legal in-progress typing states', () => {
  const { isPartial } = useNumberFormat({ locale: 'en-US' })
  expect(isPartial('')).toBe(true)
  expect(isPartial('-')).toBe(true)
  expect(isPartial('1.')).toBe(true)
  expect(isPartial('.')).toBe(true)
})

test('parse rejects garbage while isPartial stays false for it', () => {
  const { parse, isPartial } = useNumberFormat({ locale: 'en-US' })
  expect(parse('abc')).toBeNull()
  expect(isPartial('abc')).toBe(false)
})

test('format(null) and format(NaN) both return the empty string', () => {
  const { format } = useNumberFormat({ locale: 'en-US' })
  expect(format(null)).toBe('')
  expect(format(Number.NaN)).toBe('')
})

test('minFractionDigits/maxFractionDigits are honored', () => {
  const { format } = useNumberFormat({
    locale: 'en-US',
    minFractionDigits: 2,
    maxFractionDigits: 2,
  })
  expect(format(5)).toBe('5.00')
  expect(format(5.129)).toBe('5.13')
})

test('useGrouping: false omits the group separator', () => {
  const { format } = useNumberFormat({ locale: 'en-US', useGrouping: false })
  expect(format(1234)).toBe('1234')
})
