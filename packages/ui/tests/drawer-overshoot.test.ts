// A drawer on a bouncy spring overshoots its resting place and pulls off its screen edge. The panel
// backs itself toward that edge in its own colour, so the page never shows through the gap.
import '../src/style.css'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import type { DrawerSide } from '../src/components/Drawer/Drawer.vue'

const panelOf = () => document.querySelector<HTMLElement>('.ui-dialog-panel')!

for (const side of ['left', 'right', 'top', 'bottom'] as const) {
  test(`a ${side} drawer backs itself toward its edge`, async () => {
    await render(
      () => h(Drawer as never, { open: true, side: side as DrawerSide, title: 'D' }, () => 'x'),
      {
        global: { stubs: { transition: false } },
      },
    )
    await new Promise((resolve) => setTimeout(resolve, 600))
    const shadow = getComputedStyle(panelOf()).boxShadow
    // A solid copy of the panel, offset toward its screen edge.
    const [dx, dy] = {
      left: [-128, 0],
      right: [128, 0],
      top: [0, -80],
      bottom: [0, 80],
    }[side]
    expect(shadow).toContain(`${dx}px ${dy}px 0px 0px`)
  })
}

test('a Dialog card at the bottom is not backed: it floats clear of the edge', async () => {
  await render(
    () => h(Dialog as never, { open: true, position: 'bottom', title: 'N' }, () => 'x'),
    {
      global: { stubs: { transition: false } },
    },
  )
  await new Promise((resolve) => setTimeout(resolve, 600))
  expect(getComputedStyle(panelOf()).boxShadow).not.toContain('128px')
})

// The pixels, not the CSS: frozen at the top of a bounce, the gap shows the panel's colour.
test('a right drawer frozen mid-bounce shows its own colour in the gap, not the page', async () => {
  await render(
    () =>
      h(
        Drawer as never,
        {
          open: true,
          side: 'right',
          title: 'D',
          motion: {
            initial: { panel: { x: { value: '100%', spring: { damping: 0.3, response: 0.5 } } } },
          },
        },
        () => 'x',
      ),
    { global: { stubs: { transition: false } } },
  )
  let gap = 0
  for (let i = 0; i < 120 && gap < 20; i++) {
    await new Promise(requestAnimationFrame)
    const box = panelOf()?.getBoundingClientRect()
    if (box) gap = innerWidth - box.right
  }
  expect(gap).toBeGreaterThan(20)
  for (const run of panelOf().getAnimations()) run.pause()
  const shot = await page.screenshot({ base64: true })
  const image = new Image()
  image.src = `data:image/png;base64,${shot.base64}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  const scale = image.width / innerWidth
  const at = (x: number, y: number) =>
    ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data
  const box = panelOf().getBoundingClientRect()
  const inGap = at(innerWidth - 4, innerHeight / 2)
  const inPanel = at(box.left + 8, innerHeight - 8)
  // The panel's soft shadow lies over its backing, so a few levels darker at most; the dimmed page
  // would be far darker.
  expect(Math.abs(inGap[0]! - inPanel[0]!)).toBeLessThanOrEqual(8)
})
