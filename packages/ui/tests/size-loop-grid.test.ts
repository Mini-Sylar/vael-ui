// Cards that follow their size (`layout: true`) in a two-column grid, with a photo whose height
// follows its width: after fast filtering, every card comes to rest; none animates forever.
import '../src/style.css'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('fast filtering a phone-width grid of size-following cards: nothing keeps animating', async () => {
  await page.viewport(390, 844)
  const all = Array.from({ length: 12 }, (_, i) => ({ id: i, kind: i % 3 }))
  const kind = shallowRef<number | null>(null)
  const card = (item: { id: number; kind: number }) =>
    withDirectives(
      h(
        'article',
        {
          key: item.id,
          class: 'card',
          style: 'display: grid; gap: 8px; padding: 12px; border: 1px solid #ccc',
        },
        [
          h('div', { style: 'aspect-ratio: 16 / 9; background: #9ab' }),
          h('h3', { style: 'margin: 0' }, `Item ${item.id}`),
          h(
            'p',
            { style: 'margin: 0' },
            item.id % 2 ? 'Short' : 'A longer line that wraps on a phone',
          ),
        ],
      ),
      [[vAnimate, { initial: { opacity: 0, y: 12 }, layout: true }, 'cards']],
    )
  await render(() =>
    h(
      'div',
      {
        style:
          'display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; padding: 16px',
      },
      all.filter((item) => kind.value === null || item.kind === kind.value).map(card),
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 800))
  for (const next of [0, null, 1, null, 2, null]) {
    kind.value = next
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 90))
  }
  await new Promise((resolve) => setTimeout(resolve, 3000))
  const stillMoving = [...document.querySelectorAll('.card')].flatMap((c) =>
    c
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => a.id || 'x'),
  )
  expect(stillMoving).toEqual([])
})
