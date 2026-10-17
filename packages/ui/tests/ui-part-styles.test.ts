import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Timeline from '../src/components/Timeline/Timeline.vue'
import Stepper from '../src/components/Stepper/Stepper.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'

// A `ui` part given as `{ style }` must reach its element, not only `root`.
const styled = { style: 'outline: 3px solid red' }
const hasStyle = (el: Element | null) =>
  expect(el?.getAttribute('style') ?? '', el?.className).toContain('outline')

test('Timeline applies the style of every ui part', async () => {
  const screen = await render(Timeline, {
    props: {
      items: ['One', 'Two'],
      ui: { item: styled, opposite: styled, marker: styled, connector: styled, content: styled },
    },
    slots: { opposite: () => 'Now' },
  })
  for (const part of ['step', 'opposite', 'marker', 'connector', 'content'])
    hasStyle(screen.container.querySelector(`.ui-timeline-${part}`))
})

test('Stepper applies the style of every ui part', async () => {
  const screen = await render(Stepper, {
    props: {
      modelValue: 0,
      items: [{ label: 'A', description: 'First' }, { label: 'B' }],
      ui: {
        step: styled,
        trigger: styled,
        circle: styled,
        content: styled,
        label: styled,
        description: styled,
        connector: styled,
      },
    },
  })
  for (const part of ['step', 'trigger', 'circle', 'content', 'label', 'description', 'connector'])
    hasStyle(screen.container.querySelector(`.ui-stepper-${part}`))
})

test('Pagination applies the ellipsis ui part style', async () => {
  const screen = await render(Pagination, {
    props: { total: 500, page: 10, ui: { ellipsis: styled } },
  })
  hasStyle(screen.container.querySelector('[class*="ellipsis"]'))
})
