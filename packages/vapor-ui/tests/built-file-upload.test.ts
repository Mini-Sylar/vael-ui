// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import FileUploadCaptureRoot from './fixtures/FileUploadCaptureRoot.vue'

test('FileUpload only renders capture when it is set, in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(FileUploadCaptureRoot)
  app.mount(host)
  try {
    const [byDefault, environment] = host.querySelectorAll<HTMLInputElement>('input[type="file"]')
    expect(byDefault!.hasAttribute('capture')).toBe(false)
    expect(environment!.getAttribute('capture')).toBe('environment')
  } finally {
    app.unmount()
    host.remove()
  }
})
