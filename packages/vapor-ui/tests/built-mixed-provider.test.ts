// Run `pnpm build` before this test — it consumes the built output, not source.
// A vdom app mixing in Vapor components: the vdom ConfigProvider's defaults must reach them.
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, vaporInteropPlugin } from 'vue'
import MixedProviderRoot from './fixtures/MixedProviderRoot.vue'

test('a vdom ConfigProvider sets the size of a Vapor Button inside it', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  createApp(MixedProviderRoot).use(vaporInteropPlugin).mount(host)
  await expect.element(page.getByTestId('vapor-button')).toHaveClass(/ui-button--sm/)
})
