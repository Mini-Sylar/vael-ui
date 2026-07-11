/**
 * v-tooltip.bottom (modifier syntax) is untested elsewhere — every real
 * component passes `side` via the object literal instead, never modifiers.
 * Confirms Vapor's compiled call site actually supplies the 4th
 * `modifiers` argument (not just `value`/`argument`), and that
 * vTooltipVapor's `normalize()` correctly reads it.
 */
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import { tooltipTargets } from 'vael-ui'
import DirectiveModifierSpike from './fixtures/DirectiveModifierSpike.vue'

test('v-tooltip.bottom modifier sets side via the directive modifiers argument', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(DirectiveModifierSpike)
  app.mount(host)
  try {
    const target = host.querySelector<HTMLElement>('[data-testid="modifier-spike-target"]')!
    const config = tooltipTargets.get(target)
    expect(config).toBeDefined()
    expect(config!.side).toBe('bottom')
  } finally {
    app.unmount()
  }
})
