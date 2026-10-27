// The calendar loads apart from the field. Opened before it has (the first open, before the idle
// prefetch), the panel waits for it: it appears with its days already in, so its entrance plays on
// the whole panel, never on an empty one. Its own file, so the calendar isn't loaded already.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import type { Component } from 'vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'

test('the first open shows the panel with its calendar already in it', async () => {
  const seen: number[] = []
  const observer = new MutationObserver(() => {
    const panel = document.querySelector('.ui-date-picker-panel')
    if (panel && !seen.length) seen.push(panel.querySelectorAll('[data-date]').length)
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const screen = await render(() =>
    h(DatePicker as Component, { locale: 'en-US', 'aria-label': 'Date' }),
  )
  // Before the idle prefetch has had a chance to run.
  ;(screen.getByRole('combobox').element() as HTMLElement).click()
  await vi.waitFor(() => expect(seen.length).toBe(1))
  observer.disconnect()
  expect(seen[0]).toBeGreaterThan(27)
})
