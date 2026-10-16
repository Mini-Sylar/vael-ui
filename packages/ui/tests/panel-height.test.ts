import '../src/style.css'
import { page } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { Component } from 'vue'
import ComboboxFixture from './fixtures/ComboboxFixture.vue'
import MenuFixture from './fixtures/MenuFixture.vue'
import SelectFixture from './fixtures/SelectFixture.vue'
import TreeSelectFixture from './fixtures/TreeSelectFixture.vue'

// Each component wires maxPanelHeight (and its own 320px default) into
// usePopover separately, so the cap is checked per component.

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-select-positioner, .ui-menu-positioner')) {
    el.remove()
  }
})

interface PanelCase {
  fixture: Component
  props: (count: number) => Record<string, unknown>
  trigger: string
  panel: string
  body: string
  defaultCap: boolean
}

const treeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ label: `Item ${i}`, value: `item-${i}` }))

const cases: Record<string, PanelCase> = {
  Select: {
    fixture: SelectFixture,
    props: (itemCount) => ({ itemCount }),
    trigger: '[role="combobox"]',
    panel: '.ui-select-panel',
    body: '.ui-select-body',
    defaultCap: true,
  },
  Combobox: {
    fixture: ComboboxFixture,
    props: (itemCount) => ({ itemCount }),
    trigger: '[role="combobox"]',
    panel: '.ui-select-panel',
    body: '.ui-select-body',
    defaultCap: true,
  },
  TreeSelect: {
    fixture: TreeSelectFixture,
    props: (count) => ({ items: treeItems(count) }),
    trigger: '[role="combobox"]',
    panel: '.ui-select-panel',
    body: '.ui-tree-list',
    defaultCap: true,
  },
  Menu: {
    fixture: MenuFixture,
    props: (itemCount) => ({ itemCount }),
    trigger: '[data-testid="trigger"]',
    panel: '.ui-menu-panel',
    body: '.ui-menu-body',
    defaultCap: false,
  },
}

async function openPanel(c: PanelCase, props: Record<string, unknown>) {
  const screen = await render(c.fixture, { props })
  screen.container.querySelector<HTMLElement>(c.trigger)!.click()
  await vi.waitFor(() => expect(document.querySelector(c.body)).not.toBeNull())
  return {
    panel: document.querySelector<HTMLElement>(c.panel)!,
    body: document.querySelector<HTMLElement>(c.body)!,
  }
}

test.each(Object.keys(cases))(
  '%s: maxPanelHeight caps the panel below the viewport and the body scrolls inside it',
  async (name) => {
    const c = cases[name]!
    const { panel, body } = await openPanel(c, { ...c.props(100), maxPanelHeight: 160 })
    await vi.waitFor(() => expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(160))
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  },
)

test.each(Object.keys(cases).filter((name) => cases[name]!.defaultCap))(
  '%s: without maxPanelHeight the panel defaults to a 320px cap instead of filling the viewport',
  async (name) => {
    await page.viewport(800, 900)
    const c = cases[name]!
    const { panel } = await openPanel(c, c.props(100))
    await vi.waitFor(() => expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(320))
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(300)
  },
)

test.each(['Select', 'Combobox', 'Menu'])(
  '%s: the body gets a real capped height and v-scroll-mask, though max-height lives on the panel',
  async (name) => {
    const c = cases[name]!
    const { body } = await openPanel(c, c.props(name === 'Menu' ? 100 : 1000))
    await vi.waitFor(() => expect(body.className).toContain('scroll-fade'))
    expect(body.clientHeight).toBeLessThan(body.scrollHeight)
  },
)
