// The first level's width: by default at least the field's, up to a cap, so on a long field the
// next level still opens close by. `panelWidth` asks for the field's full width or sets one. The
// levels opening beside it keep their own width.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h } from 'vue'
import type { Component } from 'vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'

afterEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

const items = [
  {
    label: 'Africa',
    value: 'africa',
    children: [{ label: 'Ghana', value: 'gh', children: [{ label: 'Accra', value: 'accra' }] }],
  },
  { label: 'Europe', value: 'europe', children: [{ label: 'France', value: 'fr' }] },
]

const panels = () => [...document.querySelectorAll<HTMLElement>('.ui-menu-panel')]

async function open(fieldWidth: number, panelWidth?: 'trigger' | number | string) {
  const screen = await render(() =>
    h('div', { style: `width: ${fieldWidth}px` }, [
      h(CascadeSelect as Component, { items, panelWidth, placeholder: 'Pick a city' }),
    ]),
  )
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(panels().length).toBe(1))
  await new Promise((r) => setTimeout(r, 400))
  return panels()[0]!.getBoundingClientRect().width
}

const rem = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

test('unset, a short field gets a menu at least as wide as it', async () => {
  expect(await open(220)).toBeGreaterThanOrEqual(220 - 0.5)
})

test('unset, a long field gets a menu no wider than the cap, and a submenu keeps its own width', async () => {
  expect(await open(640)).toBeCloseTo(16 * rem(), 0)
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(panels().length).toBe(2))
  await new Promise((r) => setTimeout(r, 400))
  expect(panels()[1]!.getBoundingClientRect().width).toBeLessThan(16 * rem())
})

test("'trigger' matches a long field all the way", async () => {
  expect(await open(640, 'trigger')).toBeCloseTo(640, 0)
})

test('a set width in px is the width', async () => {
  expect(await open(640, 300)).toBeCloseTo(300, 0)
})

test('a set width can be any CSS length', async () => {
  expect(await open(640, '20rem')).toBeCloseTo(20 * rem(), 0)
})
