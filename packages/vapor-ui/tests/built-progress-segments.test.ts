// A Progress segment's tooltip, class and style through the BUILT vapor bundle, bar and ring.
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import { tooltipTargets } from 'vael-ui'
import ProgressSegmentsVaporRoot from './fixtures/ProgressSegmentsVaporRoot.vue'

test('the built vapor bundle puts a segment tooltip, class and style on its fill', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ProgressSegmentsVaporRoot)
  app.mount(host)
  try {
    const bars = host.querySelectorAll('.ui-progress-fill')
    expect(bars).toHaveLength(4)
    for (const fills of [
      [bars[0]!, bars[1]!],
      [bars[2]!, bars[3]!],
    ]) {
      expect(tooltipTargets.get(fills[0] as HTMLElement)?.content).toBe('At the depot')
      expect(fills[0]).toHaveClass('stop')
      expect(tooltipTargets.has(fills[1] as HTMLElement)).toBe(false)
    }
    expect((bars[1] as HTMLElement).style.minInlineSize).toBe('6px')
  } finally {
    app.unmount()
  }
})
