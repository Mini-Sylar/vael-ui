// Reads a date typed in the active locale, for DatePicker's input. No date library: Intl supplies
// the field order, month names and the literal words a formatted date may hold.

/** @internal What a typed date names: a day, a month (its 1st) or a year (January 1st). */
export type DateTextView = 'date' | 'month' | 'year'

/** @internal */
export interface DateTextOptions {
  /** BCP-47 locale; unset, the runtime default. */
  locale?: string
  /** @default 'date' */
  view?: DateTextView
  /** `true` reads an optional time after the date; `'only'` reads a time alone. */
  time?: boolean | 'only'
  /** Gives the day for `time: 'only'`, and the time when a date is typed without one. */
  base?: Date | null
  /** Two-digit years land within 50 years of this one. Unset, the current year. */
  referenceYear?: number
}

type Field = 'day' | 'month' | 'year'

interface LocaleData {
  order: Field[]
  months: string[][]
  words: Set<string>
  am: Set<string>
  pm: Set<string>
  timeSeps: Set<string>
  digits: string[]
}

interface Token {
  text: string
  num: boolean
  start: number
  end: number
}

const SAMPLE = new Date(2000, 10, 22, 21, 30)
const WORD = /[\p{L}\p{M}]+/gu
const TOKEN = /\d+|[\p{L}\p{M}]+/gu
const cache = new Map<string, LocaleData>()

function fold(text: string, locale: string | undefined): string {
  return text.toLocaleLowerCase(locale).replace(/\./g, '')
}

function localeData(locale: string | undefined): LocaleData {
  const cached = cache.get(locale ?? '')
  if (cached) return cached
  const format = (options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options)
  const words = new Set<string>()
  const addWords = (text: string) => {
    for (const word of text.match(WORD) ?? []) words.add(fold(word, locale))
  }

  const order = format()
    .formatToParts(SAMPLE)
    .map((part) => part.type)
    .filter((type): type is Field => type === 'day' || type === 'month' || type === 'year')

  // Month names as they stand alone and beside a day (some languages inflect them).
  const months: string[][] = Array.from({ length: 12 }, () => [])
  for (const month of ['long', 'short'] as const) {
    for (const options of [{ month }, { day: 'numeric', month }] as const) {
      const formatter = format(options)
      for (let i = 0; i < 12; i++) {
        const value =
          formatter.formatToParts(new Date(2000, i, 1)).find((p) => p.type === 'month')?.value ?? ''
        // "6月" is a number and a literal word, read like a numeric month.
        if (/\d/.test(value)) addWords(value)
        else if (value && !months[i]!.includes(fold(value, locale))) {
          months[i]!.push(fold(value, locale))
        }
      }
    }
  }
  for (const dateStyle of ['full', 'long', 'medium', 'short'] as const) {
    for (const part of format({ dateStyle }).formatToParts(SAMPLE)) {
      if (part.type !== 'month') addWords(part.value)
    }
  }
  for (const weekday of ['long', 'short'] as const) {
    const formatter = format({ weekday })
    for (let i = 0; i < 7; i++) addWords(formatter.format(new Date(2000, 0, 2 + i)))
  }

  const period = (hour: number) =>
    format({ hour: 'numeric', hour12: true })
      .formatToParts(new Date(2000, 0, 1, hour))
      .find((p) => p.type === 'dayPeriod')?.value
  const am = new Set(['am', 'a'])
  const pm = new Set(['pm', 'p'])
  const amText = period(9)
  const pmText = period(21)
  if (amText) am.add(fold(amText, locale).replace(/\s/g, ''))
  if (pmText) pm.add(fold(pmText, locale).replace(/\s/g, ''))

  const timeParts = format({ hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(
    SAMPLE,
  )
  const hourAt = timeParts.findIndex((p) => p.type === 'hour')
  const timeSeps = new Set([':', timeParts[hourAt + 1]?.value.trim() || ':'])

  const plain = new Intl.NumberFormat(locale, { useGrouping: false })
  const digits = Array.from({ length: 10 }, (_, digit) => plain.format(digit))

  const data = { order, months, words, am, pm, timeSeps, digits }
  cache.set(locale ?? '', data)
  return data
}

function tokenize(text: string): Token[] {
  return [...text.matchAll(TOKEN)].map((match) => ({
    text: match[0],
    num: /\d/.test(match[0][0]!),
    start: match.index,
    end: match.index + match[0].length,
  }))
}

function monthOf(word: string, data: LocaleData): number | undefined {
  const exact = data.months.findIndex((names) => names.includes(word))
  if (exact >= 0) return exact
  if (data.words.has(word) || word.length < 3) return undefined
  // A unique start of a month name: "sept", "janu".
  const matches = data.months.flatMap((names, i) =>
    names.some((name) => name.startsWith(word)) ? [i] : [],
  )
  return matches.length === 1 ? matches[0] : undefined
}

function expandYear(short: number, reference: number): number {
  let year = reference - (reference % 100) + short
  if (year > reference + 50) year -= 100
  else if (year <= reference - 50) year += 100
  return year
}

function readDate(
  tokens: Token[],
  data: LocaleData,
  locale: string | undefined,
  view: DateTextView,
  reference: number,
): Date | null {
  let monthWord: number | undefined
  const nums: string[] = []
  for (const token of tokens) {
    if (token.num) {
      nums.push(token.text)
      continue
    }
    const word = fold(token.text, locale)
    const month = monthOf(word, data)
    if (month !== undefined && monthWord === undefined && view !== 'year') monthWord = month
    else if (month !== undefined || !data.words.has(word)) return null
  }
  let fields: Field[] =
    view === 'year' ? ['year'] : data.order.filter((f) => view === 'date' || f !== 'day')
  if (monthWord !== undefined) fields = fields.filter((f) => f !== 'month')
  // A leading four-digit year reads year first, as in ISO yyyy-mm-dd.
  if (nums[0]?.length === 4 && fields[0] !== 'year' && fields.includes('year')) {
    fields = (['year', 'month', 'day'] as const).filter((f) => fields.includes(f))
  }
  if (nums.length !== fields.length) return null

  let year = NaN
  let month = monthWord ?? 0
  let day = 1
  for (let i = 0; i < fields.length; i++) {
    const text = nums[i]!
    const value = Number(text)
    if (fields[i] === 'year') {
      if (text.length !== 2 && text.length !== 4) return null
      year = text.length === 2 ? expandYear(value, reference) : value
    } else if (text.length > 2) return null
    else if (fields[i] === 'month') month = value - 1
    else day = value
  }
  if (!(year >= 1) || month < 0 || month > 11) return null
  if (day < 1 || day > new Date(2000, month + 1, 0).getDate()) return null
  const date = new Date(2000, 0, 1)
  date.setFullYear(year, month, day)
  // Feb 29 in a year without one rolls into March.
  return date.getMonth() === month ? date : null
}

interface TimeRead {
  hour: number
  minute: number
  rest: Token[]
}

// The last h:mm (or h:mm:ss) run in the text, with an AM/PM word anywhere in it.
function readTime(
  text: string,
  tokens: Token[],
  data: LocaleData,
  locale?: string,
): TimeRead | null {
  const sepBetween = (a: Token, b: Token) => data.timeSeps.has(text.slice(a.end, b.start).trim())
  let last = -1
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i]!.num) {
      last = i
      break
    }
  }
  if (last < 1) return null
  let first = last - 1
  const [a, b, c] = [tokens[last - 2], tokens[last - 1]!, tokens[last]!]
  if (!b.num || !sepBetween(b, c) || c.text.length !== 2) return null
  // Seconds are read past, never kept.
  if (a?.num && sepBetween(a, b) && b.text.length === 2) first = last - 2
  const hourText = tokens[first]!.text
  const minuteText = tokens[first + 1]!.text
  if (hourText.length > 2) return null
  let hour = Number(hourText)
  const minute = Number(minuteText)
  if (minute > 59 || (first === last - 2 && Number(c.text) > 59)) return null

  let period: 'am' | 'pm' | undefined
  const rest: Token[] = []
  tokens.forEach((token, i) => {
    if (i >= first && i <= last) return
    const word = token.num ? '' : fold(token.text, locale)
    if (!period && data.am.has(word)) period = 'am'
    else if (!period && data.pm.has(word)) period = 'pm'
    else rest.push(token)
  })
  if (period) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (period === 'pm' ? 12 : 0)
  } else if (hour > 23) return null
  return { hour, minute, rest }
}

/**
 * @internal Reads a typed date in the locale's own field order (month/day/year in en-US,
 * day/month/year in en-GB and de, year/month/day in ja), with any separators, a month name or
 * a leading four-digit year (`2024-06-15`). Days and months take one or two digits; years two
 * or four. Returns `null` when the text isn't one valid date.
 */
export function parseDateText(input: string, options: DateTextOptions = {}): Date | null {
  const { locale, view = 'date', time, base } = options
  const data = localeData(locale)
  let text = input.trim()
  if (data.digits[0] !== '0') {
    text = text.replace(/./gu, (ch) => {
      const digit = data.digits.indexOf(ch)
      return digit < 0 ? ch : String(digit)
    })
  }
  if (!text) return null
  const tokens = tokenize(text)
  const reference = options.referenceYear ?? new Date().getFullYear()

  if (time) {
    const read = readTime(text, tokens, data, locale)
    if (time === 'only') {
      if (!read) return null
      for (const token of read.rest) {
        if (token.num || !data.words.has(fold(token.text, locale))) return null
      }
      const out = new Date(base ?? new Date())
      out.setHours(read.hour, read.minute, 0, 0)
      return out
    }
    const day = read && readDate(read.rest, data, locale, view, reference)
    if (day) {
      day.setHours(read.hour, read.minute, 0, 0)
      return day
    }
  }
  const day = readDate(tokens, data, locale, view, reference)
  if (day && time && base) day.setHours(base.getHours(), base.getMinutes(), 0, 0)
  return day
}

/** @internal Splits "start – end" at its dash (an en or em dash, or a spaced hyphen). */
export function splitDateRange(text: string): string[] {
  return text.split(/\s*[–—]\s*|\s+-\s+/)
}

/**
 * @internal Whether Calendar would refuse `date`: a day outside `minDate`/`maxDate` or in
 * `disabledDates`, or a month or year wholly outside the bounds.
 */
export function isDateUnavailable(
  date: Date,
  view: DateTextView,
  minDate?: Date,
  maxDate?: Date,
  disabledDates?: Date[] | ((date: Date) => boolean),
): boolean {
  const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const start =
    view === 'year'
      ? new Date(date.getFullYear(), 0, 1)
      : view === 'month'
        ? new Date(date.getFullYear(), date.getMonth(), 1)
        : dayOf(date)
  const end =
    view === 'year'
      ? new Date(date.getFullYear(), 11, 31)
      : view === 'month'
        ? new Date(date.getFullYear(), date.getMonth() + 1, 0)
        : start
  if (minDate && end < dayOf(minDate)) return true
  if (maxDate && start > dayOf(maxDate)) return true
  if (view !== 'date' || !disabledDates) return false
  if (typeof disabledDates === 'function') return disabledDates(start)
  return disabledDates.some((d) => dayOf(d).getTime() === start.getTime())
}
