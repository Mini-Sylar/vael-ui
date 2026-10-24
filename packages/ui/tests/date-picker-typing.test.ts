import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef } from 'vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import type { CalendarRange } from '../src/components/Calendar/Calendar.vue'
import { isDateUnavailable, parseDateText, splitDateRange } from '../src/composables/dateText'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

const iso = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : null
const hm = (date: Date | null) =>
  date
    ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : null
const read = (text: string, locale: string, view?: 'date' | 'month' | 'year') =>
  iso(parseDateText(text, { locale, view, referenceYear: 2026 }))

describe('parseDateText', () => {
  test('numeric dates follow the locale order', () => {
    expect(read('6/15/2024', 'en-US')).toBe('2024-06-15')
    expect(read('06/05/2024', 'en-US')).toBe('2024-06-05')
    expect(read('15/6/2024', 'en-GB')).toBe('2024-06-15')
    expect(read('15.06.2024', 'de')).toBe('2024-06-15')
    expect(read('5.6.24', 'de')).toBe('2024-06-05')
    expect(read('2024/6/15', 'ja')).toBe('2024-06-15')
    expect(read('15/06/2024', 'fr')).toBe('2024-06-15')
    // The same text means another day in another locale.
    expect(read('3/4/2024', 'en-US')).toBe('2024-03-04')
    expect(read('3/4/2024', 'en-GB')).toBe('2024-04-03')
  })

  test('any separator works, and ISO yyyy-mm-dd works everywhere', () => {
    expect(read('6-15-2024', 'en-US')).toBe('2024-06-15')
    expect(read('6 15 2024', 'en-US')).toBe('2024-06-15')
    for (const locale of ['en-US', 'en-GB', 'de', 'ja', 'fr']) {
      expect(read('2024-06-15', locale)).toBe('2024-06-15')
    }
    expect(read('2024/06/15', 'de')).toBe('2024-06-15')
  })

  test('two-digit years land within 50 years of now; other lengths fail', () => {
    expect(read('6/15/24', 'en-US')).toBe('2024-06-15')
    expect(read('6/15/80', 'en-US')).toBe('1980-06-15')
    expect(read('6/15/76', 'en-US')).toBe('2076-06-15')
    expect(read('6/15/024', 'en-US')).toBeNull()
    expect(read('6/15/20245', 'en-US')).toBeNull()
    expect(read('006/15/2024', 'en-US')).toBeNull()
  })

  test('the formatted text reads back: month names, weekdays and literal words', () => {
    expect(read('Jun 15, 2024', 'en-US')).toBe('2024-06-15')
    expect(read('June 15 2024', 'en-US')).toBe('2024-06-15')
    expect(read('15 Jun 2024', 'en-GB')).toBe('2024-06-15')
    expect(read('Sat, 15 June 2024', 'en-GB')).toBe('2024-06-15')
    expect(read('15. Juni 2024', 'de')).toBe('2024-06-15')
    expect(read('15 de junio de 2024', 'es')).toBe('2024-06-15')
    expect(read('15 juin 2024', 'fr')).toBe('2024-06-15')
    expect(read('2024年6月15日', 'ja')).toBe('2024-06-15')
    expect(read('sept 3 2024', 'en-US')).toBe('2024-09-03')
    // Each locale's own display reads back.
    for (const locale of ['en-US', 'en-GB', 'de', 'ja', 'fr', 'es', 'ko', 'zh', 'ar-EG']) {
      const shown = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        new Date(2024, 5, 15),
      )
      expect(read(shown, locale), `${locale}: ${shown}`).toBe('2024-06-15')
    }
  })

  test('nonsense, impossible days and stray words fail', () => {
    expect(read('', 'en-US')).toBeNull()
    expect(read('tomorrow', 'en-US')).toBeNull()
    expect(read('6/15', 'en-US')).toBeNull()
    expect(read('6/15/2024/1', 'en-US')).toBeNull()
    expect(read('13/1/2024', 'en-US')).toBeNull()
    expect(read('2/30/2024', 'en-US')).toBeNull()
    expect(read('2/29/2023', 'en-US')).toBeNull()
    expect(read('2/29/2024', 'en-US')).toBe('2024-02-29')
    expect(read('6/15/2024 banana', 'en-US')).toBeNull()
    expect(read('Ju 15 2024', 'en-US')).toBeNull()
    expect(read('June July 2024', 'en-US')).toBeNull()
  })

  test('month and year views', () => {
    expect(read('June 2024', 'en-US', 'month')).toBe('2024-06-01')
    expect(read('6/2024', 'en-US', 'month')).toBe('2024-06-01')
    expect(read('06.2024', 'de', 'month')).toBe('2024-06-01')
    expect(read('2024-06', 'de', 'month')).toBe('2024-06-01')
    expect(read('2024年6月', 'ja', 'month')).toBe('2024-06-01')
    expect(read('2024', 'en-US', 'year')).toBe('2024-01-01')
    expect(read('99', 'en-US', 'year')).toBe('1999-01-01')
    expect(read('June 2024', 'en-US', 'year')).toBeNull()
  })

  test('a time after the date, as each locale shows it', () => {
    const at = (text: string, locale: string) =>
      parseDateText(text, { locale, time: true, referenceYear: 2026 })
    expect(hm(at('Jun 15, 2024, 9:30 PM', 'en-US'))).toBe('21:30')
    expect(hm(at('6/15/2024 12:05 am', 'en-US'))).toBe('00:05')
    expect(hm(at('6/15/2024 21:30', 'en-US'))).toBe('21:30')
    expect(hm(at('15.06.2024, 09:30', 'de'))).toBe('09:30')
    expect(hm(at('2024/06/15 9:30', 'ja'))).toBe('09:30')
    expect(iso(at('15.06.2024, 09:30', 'de'))).toBe('2024-06-15')
    expect(at('6/15/2024 13:30 PM', 'en-US')).toBeNull()
    expect(at('6/15/2024 9:75', 'en-US')).toBeNull()
    // No time typed: the base keeps its time.
    const base = new Date(2020, 0, 1, 8, 45)
    expect(hm(parseDateText('6/15/2024', { locale: 'en-US', time: true, base }))).toBe('08:45')
    // A two-digit German year isn't mistaken for minutes.
    expect(iso(at('15.6.24', 'de'))).toBe('2024-06-15')
    for (const locale of ['en-US', 'de', 'ja', 'ko', 'fi']) {
      const date = new Date(2024, 5, 15, 21, 30)
      const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
      const day = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
      const shown = `${day.format(date)}, ${time.format(date)}`
      expect(hm(at(shown, locale)), `${locale}: ${shown}`).toBe('21:30')
      expect(iso(at(shown, locale)), `${locale}: ${shown}`).toBe('2024-06-15')
    }
  })

  test('a time alone keeps the base day', () => {
    const base = new Date(2024, 5, 15, 8, 0)
    const only = (text: string, locale = 'en-US') =>
      parseDateText(text, { locale, time: 'only', base })
    expect(hm(only('9:30 PM'))).toBe('21:30')
    expect(iso(only('9:30 PM'))).toBe('2024-06-15')
    expect(hm(only('午後9:30', 'ja'))).toBe('21:30')
    expect(only('9:30 PM tomorrow')).toBeNull()
    expect(only('6/15/2024 9:30')).toBeNull()
    expect(only('930')).toBeNull()
  })

  test('ranges split at the displayed dash', () => {
    expect(splitDateRange('Jun 15, 2024 – Jun 20, 2024')).toEqual(['Jun 15, 2024', 'Jun 20, 2024'])
    expect(splitDateRange('2024-06-15 - 2024-06-20')).toEqual(['2024-06-15', '2024-06-20'])
    expect(splitDateRange('2024-06-15')).toEqual(['2024-06-15'])
  })

  test('availability matches the calendar', () => {
    const min = new Date(2024, 5, 10)
    const max = new Date(2024, 5, 20, 15)
    expect(isDateUnavailable(new Date(2024, 5, 9), 'date', min, max)).toBe(true)
    expect(isDateUnavailable(new Date(2024, 5, 20, 23), 'date', min, max)).toBe(false)
    expect(isDateUnavailable(new Date(2024, 5, 21), 'date', min, max)).toBe(true)
    expect(isDateUnavailable(new Date(2024, 5, 1), 'month', min, max)).toBe(false)
    expect(isDateUnavailable(new Date(2024, 6, 1), 'month', min, max)).toBe(true)
    expect(
      isDateUnavailable(new Date(2024, 5, 12), 'date', undefined, undefined, [
        new Date(2024, 5, 12, 9),
      ]),
    ).toBe(true)
    expect(
      isDateUnavailable(
        new Date(2024, 5, 13),
        'date',
        undefined,
        undefined,
        (d) => d.getDay() === 0,
      ),
    ).toBe(false)
  })
})

type Value = Date | CalendarRange | null

async function renderPicker(props: Record<string, unknown> = {}, initial: Value = null) {
  const model = shallowRef<Value>(initial)
  const changes: Value[] = []
  const Host = defineComponent(
    () => () =>
      h('div', [
        h(DatePicker, {
          locale: 'en-US',
          motion: false,
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (value: Value) => (model.value = value),
          onChange: (value: Value) => changes.push(value),
        }),
        h('button', { type: 'button' }, 'Next field'),
      ]),
  )
  const screen = await render(Host)
  const input = screen.getByRole('combobox').element() as HTMLInputElement
  return { screen, model, changes, input }
}

// Focus without a click, select what's there, and type over it.
async function typeOver(input: HTMLInputElement, text: string) {
  input.focus()
  input.select()
  if (text) await userEvent.keyboard(text)
  else await userEvent.keyboard('{Backspace}')
}
const single = (value: Value) => (value instanceof Date ? iso(value) : value)

describe('DatePicker typed entry', () => {
  test('the input is typeable; Enter commits in the locale and shows the formatted date', async () => {
    const { input, model, changes } = await renderPicker()
    expect(input.readOnly).toBe(false)
    await typeOver(input, '6/20/2024')
    // Typing never opens the panel.
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(model.value).toBeNull()
    await userEvent.keyboard('{Enter}')
    expect(single(model.value)).toBe('2024-06-20')
    expect(changes.map(single)).toEqual(['2024-06-20'])
    await vi.waitFor(() => expect(input.value).toBe('Jun 20, 2024'))
    expect(input.getAttribute('aria-expanded')).toBe('false')
    // Enter on the shown value opens the panel, as before.
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(input.getAttribute('aria-expanded')).toBe('true'))
  })

  test('blur commits, in each locale’s own order', async () => {
    for (const [locale, text] of [
      ['en-GB', '20/6/2024'],
      ['de', '20.6.2024'],
      ['ja', '2024/6/20'],
      ['fr', '2024-06-20'],
    ] as const) {
      const { screen, input, model } = await renderPicker({ locale })
      await typeOver(input, text)
      await userEvent.keyboard('{Tab}')
      expect(single(model.value), locale).toBe('2024-06-20')
      screen.unmount()
    }
  })

  test('an entry that doesn’t read keeps the value and marks the field invalid until fixed', async () => {
    const { input, model, changes } = await renderPicker({}, new Date(2024, 5, 15))
    await typeOver(input, '13/45/2024')
    await userEvent.keyboard('{Enter}')
    expect(single(model.value)).toBe('2024-06-15')
    expect(changes).toEqual([])
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.closest('.ui-input')!.getAttribute('data-state')).toBe('invalid')
    // The text stays for fixing.
    expect(input.value).toBe('13/45/2024')
    // Fixing it lifts the flag before it's committed.
    await typeOver(input, '6/16/2024')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    await userEvent.keyboard('{Enter}')
    expect(single(model.value)).toBe('2024-06-16')
  })

  test('a day outside minDate, maxDate or disabledDates is refused like nonsense', async () => {
    const { input, model } = await renderPicker(
      {
        minDate: new Date(2024, 5, 10),
        maxDate: new Date(2024, 5, 20),
        disabledDates: [new Date(2024, 5, 12)],
      },
      new Date(2024, 5, 15),
    )
    for (const text of ['6/9/2024', '6/21/2024', '6/12/2024']) {
      await typeOver(input, text)
      await userEvent.keyboard('{Enter}')
      expect(single(model.value), text).toBe('2024-06-15')
      expect(input.getAttribute('aria-invalid'), text).toBe('true')
    }
    await typeOver(input, '6/11/2024')
    await userEvent.keyboard('{Enter}')
    expect(single(model.value)).toBe('2024-06-11')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
  })

  test('Escape drops what was typed; clearing the text clears the value', async () => {
    const { input, model, changes } = await renderPicker({}, new Date(2024, 5, 15))
    await typeOver(input, '7/4/20')
    await userEvent.keyboard('{Escape}')
    expect(input.value).toBe('Jun 15, 2024')
    expect(single(model.value)).toBe('2024-06-15')
    // Escape after an invalid entry lifts the flag too.
    await typeOver(input, 'soon')
    await userEvent.keyboard('{Enter}{Escape}')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect(input.value).toBe('Jun 15, 2024')

    await typeOver(input, '')
    await userEvent.keyboard('{Tab}')
    expect(model.value).toBeNull()
    expect(changes).toEqual([null])
    expect(input.value).toBe('')
  })

  test('a picked date replaces a pending invalid entry', async () => {
    const { input, model } = await renderPicker({}, new Date(2024, 5, 15))
    await typeOver(input, 'nope')
    await userEvent.keyboard('{Enter}')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-15'),
    )
    await userEvent.keyboard('{ArrowRight}{Enter}')
    expect(single(model.value)).toBe('2024-06-16')
    await vi.waitFor(() => expect(input.value).toBe('Jun 16, 2024'))
    expect(input.hasAttribute('aria-invalid')).toBe(false)
  })

  test('range: "start – end" with the displayed dash, a spaced hyphen, or the ends reversed', async () => {
    const { input, model } = await renderPicker({ selectionMode: 'range' })
    const range = () => {
      const value = model.value as CalendarRange
      return `${iso(value.start)} / ${iso(value.end)}`
    }
    await typeOver(input, '6/10/2024 – 6/14/2024')
    await userEvent.keyboard('{Enter}')
    expect(range()).toBe('2024-06-10 / 2024-06-14')
    await vi.waitFor(() => expect(input.value).toBe('Jun 10, 2024 – Jun 14, 2024'))
    await typeOver(input, '2024-07-09 - 2024-07-01')
    await userEvent.keyboard('{Enter}')
    expect(range()).toBe('2024-07-01 / 2024-07-09')
    // One date starts a range.
    await typeOver(input, '8/1/2024')
    await userEvent.keyboard('{Enter}')
    expect(range()).toBe('2024-08-01 / null')
    await vi.waitFor(() => expect(input.value).toBe('Aug 1, 2024 – …'))
    await typeOver(input, '8/1/2024 – 8/40/2024')
    await userEvent.keyboard('{Enter}')
    expect(range()).toBe('2024-08-01 / null')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  test('time modes read the time as shown', async () => {
    const withTime = await renderPicker({ showTime: true }, new Date(2024, 5, 15, 8, 0))
    expect(withTime.input.value).toBe('Jun 15, 2024, 8:00 AM')
    await typeOver(withTime.input, 'Jun 20, 2024, 9:30 PM')
    await userEvent.keyboard('{Enter}')
    const value = withTime.model.value as Date
    expect(`${iso(value)} ${hm(value)}`).toBe('2024-06-20 21:30')
    withTime.screen.unmount()

    const timeOnly = await renderPicker(
      { timeOnly: true, hourFormat: '24' },
      new Date(2024, 5, 15, 8, 0),
    )
    await typeOver(timeOnly.input, '18:45')
    await userEvent.keyboard('{Enter}')
    const time = timeOnly.model.value as Date
    expect(`${iso(time)} ${hm(time)}`).toBe('2024-06-15 18:45')
    await typeOver(timeOnly.input, '25:00')
    await userEvent.keyboard('{Enter}')
    expect(timeOnly.input.getAttribute('aria-invalid')).toBe('true')
  })

  test('month view reads a month', async () => {
    const { input, model } = await renderPicker({ view: 'month' })
    await typeOver(input, 'July 2024')
    await userEvent.keyboard('{Enter}')
    expect(single(model.value)).toBe('2024-07-01')
    await vi.waitFor(() => expect(input.value).toBe('July 2024'))
    // The keys open it on the month grid with focus on the chosen month.
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-month')).toBe('6'))
  })

  test('Space types; ArrowDown commits and moves into the calendar on the typed day', async () => {
    const { input, model } = await renderPicker()
    await typeOver(input, 'Jun 20 2024')
    expect(input.value).toBe('Jun 20 2024')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    await userEvent.keyboard('{ArrowDown}')
    expect(single(model.value)).toBe('2024-06-20')
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-20'),
    )
  })

  test('a click opens the panel and leaves focus in the input; the button moves it in', async () => {
    const { screen, input } = await renderPicker({}, new Date(2024, 5, 15))
    await screen.getByRole('combobox').click()
    await vi.waitFor(() =>
      expect(document.querySelector('[data-date="2024-06-15"]')).not.toBeNull(),
    )
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(input.getAttribute('aria-expanded')).toBe('false'))

    const button = screen.getByRole('button', { name: 'Choose date' })
    expect((button.element() as HTMLElement).tabIndex).toBe(-1)
    await button.click()
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-15'),
    )
    // Picking returns focus to the input, not the button.
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(document.activeElement).toBe(input))
  })
})
