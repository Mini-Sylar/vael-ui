import '../src/style.css'
import { h, nextTick, shallowRef } from 'vue'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Dock from '../src/components/Dock/Dock.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'
import PullToRefresh from '../src/components/PullToRefresh/PullToRefresh.vue'
import Radio from '../src/components/Radio/Radio.vue'
import RadioGroup from '../src/components/RadioGroup/RadioGroup.vue'

// Radio drops its first-paint guard a tick after mounting.
const settled = async () => {
  await nextTick()
  await nextTick()
}

test('Radio: motionCss=false switches its transitions off, and the elements are exposed', async () => {
  const radio = shallowRef<InstanceType<typeof Radio> | null>(null)
  const make = (motionCss: boolean) =>
    h(RadioGroup, { modelValue: 'a' }, () => [
      h(Radio, { ref: radio, value: 'a', label: 'A', motionCss }),
    ])
  const on = await render(() => make(true))
  await settled()
  expect(document.querySelector('.ui-radio')!.classList.contains('ui-radio--no-anim')).toBe(false)
  expect(radio.value!.controlEl).toBeInstanceOf(HTMLElement)
  expect(radio.value!.dotEl).toBeInstanceOf(HTMLElement)
  on.unmount()

  await render(() => make(false))
  await settled()
  const root = document.querySelector('.ui-radio')!
  expect(root.classList.contains('ui-radio--no-anim')).toBe(true)
  expect(getComputedStyle(root.querySelector('.ui-radio-dot')!).transitionDuration).toBe('0s')
})

test('Pagination: motionCss=false stops the indicator sliding, and the elements are exposed', async () => {
  const pagination = shallowRef<InstanceType<typeof Pagination> | null>(null)
  const page = shallowRef(3)
  const make = (motionCss: boolean) =>
    h(Pagination, { ref: pagination, page: page.value, total: 100, motionCss })
  const root = () => document.querySelector('.ui-pagination')!
  const slide = async () => {
    page.value = page.value === 3 ? 4 : 3
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return getComputedStyle(document.querySelector('.ui-pagination-indicator')!).transitionDuration
  }

  const on = await render(() => make(true))
  expect(root().classList.contains('ui-pagination--no-motion')).toBe(false)
  expect(pagination.value!.indicatorEl).toBeInstanceOf(HTMLElement)
  expect(pagination.value!.labelsEl).toBeInstanceOf(HTMLElement)
  expect(pagination.value!.listEl).toBeInstanceOf(HTMLElement)
  expect(await slide()).not.toBe('0s')
  on.unmount()

  await render(() => make(false))
  expect(root().classList.contains('ui-pagination--no-motion')).toBe(true)
  expect(await slide()).toBe('0s')
})

test('PullToRefresh: motionCss=false skips the settle transitions, and zoneEl is exposed', async () => {
  const ptr = shallowRef<InstanceType<typeof PullToRefresh> | null>(null)
  const make = (motionCss: boolean) =>
    h(PullToRefresh, { ref: ptr, onRefresh: () => {}, motionCss, style: 'block-size: 200px' }, () =>
      h('div', { style: 'block-size: 800px' }, 'content'),
    )
  const on = await render(() => make(true))
  const zone = () => document.querySelector<HTMLElement>('.ui-pull-to-refresh-zone')!
  expect(zone().style.transition).toBe('')
  expect(ptr.value!.zoneEl).toBe(zone())
  on.unmount()

  await render(() => make(false))
  expect(zone().style.transition).toBe('none')
  expect(
    getComputedStyle(document.querySelector('.ui-pull-to-refresh-arrow') ?? zone())
      .transitionDuration,
  ).toBe('0s')
})

test('Dock: itemEls hands back the item buttons in order', async () => {
  const dock = shallowRef<InstanceType<typeof Dock> | null>(null)
  const items = [{ label: 'Home' }, { label: 'Search' }, { label: 'Settings' }]
  await render(() => h(Dock, { ref: dock, items, magnify: false, 'aria-label': 'Apps' }))
  const els = dock.value!.itemEls()
  expect(els.map((el) => el.getAttribute('aria-label'))).toEqual(['Home', 'Search', 'Settings'])
})

test('every list exposes its hover and keyboard highlight as highlightEl, and a selection as indicatorEl', async () => {
  const { default: SelectButton } = await import('../src/components/SelectButton/SelectButton.vue')
  const { default: MenuList } = await import('../src/components/MenuList/MenuList.vue')
  const { default: Tabs } = await import('../src/components/Tabs/Tabs.vue')
  const segmented = shallowRef<{ highlightEl: unknown; indicatorEl: unknown } | null>(null)
  const nav = shallowRef<{ highlightEl: unknown; indicatorEl: unknown } | null>(null)
  const tabs = shallowRef<{ highlightEl: unknown } | null>(null)
  const pagination = shallowRef<{ highlightEl: unknown; indicatorEl: unknown } | null>(null)
  await render(() => [
    h(SelectButton as never, {
      ref: segmented,
      modelValue: 'a',
      items: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    }),
    h(MenuList as never, { ref: nav, items: [{ label: 'Home', value: 'home' }], active: 'home' }),
    h(Tabs as never, { ref: tabs, active: 'a', items: ['a', 'b'] }),
    h(Pagination, { ref: pagination as never, page: 2, total: 50 }),
  ])
  await settled()
  for (const owner of [segmented, nav, pagination]) {
    expect(owner.value!.highlightEl).toBeInstanceOf(HTMLElement)
    expect(owner.value!.indicatorEl).toBeInstanceOf(HTMLElement)
    expect(owner.value!.highlightEl).not.toBe(owner.value!.indicatorEl)
  }
  expect(tabs.value!.highlightEl).toBeInstanceOf(HTMLElement)
})
