import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, onMounted } from 'vue'
import { trackResources } from './utils/resources'
import { defineLeakTests } from './utils/leaks'

defineLeakTests(0, 3)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('the tracker catches a component that leaks each kind of resource', async () => {
  const Leaky = {
    setup() {
      onMounted(() => {
        window.addEventListener('resize', () => {})
        new ResizeObserver(() => {}).observe(document.body)
        const loop = () => requestAnimationFrame(loop)
        loop()
        setInterval(() => {}, 1000)
      })
      return () => h('div')
    },
  }
  const tracker = trackResources()
  try {
    const screen = await render(Leaky)
    screen.unmount()
    await wait(100)
    const left = tracker.snapshot()
    expect(left.listeners).toEqual(['window:resize'])
    expect(left.observers).toEqual(['ResizeObserver(1)'])
    expect(left.frames).toBe(1)
    expect(left.intervals).toBe(1)
  } finally {
    tracker.restore()
  }
})
