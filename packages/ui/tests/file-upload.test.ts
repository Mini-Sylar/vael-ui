import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { nextTick } from 'vue'
import FileUploadFixture from './fixtures/FileUploadFixture.vue'

function makeFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

// `new DragEvent('drop', { dataTransfer })` does not reliably attach the
// DataTransfer in Chromium — the constructor's init dict silently drops it.
// Defining it directly on the dispatched event is the robust workaround.
function dragEventWithFiles(type: string, dataTransfer: DataTransfer): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  return event
}

function dropOn(el: Element, files: File[]) {
  const dataTransfer = new DataTransfer()
  for (const file of files) dataTransfer.items.add(file)
  el.dispatchEvent(dragEventWithFiles('dragenter', dataTransfer))
  el.dispatchEvent(dragEventWithFiles('dragover', dataTransfer))
  el.dispatchEvent(dragEventWithFiles('drop', dataTransfer))
}

test('motionCss=false hands the item enter/leave transition to item-enter/item-leave instead of running the built-in CSS transition', async () => {
  const { default: FileUpload } = await import('../src/components/FileUpload/FileUpload.vue')
  const enters: Array<[Element, () => void]> = []
  const leaves: Array<[Element, () => void]> = []
  const screen = render(FileUpload, {
    props: { motionCss: false },
    attrs: {
      onItemEnter: (el: Element, done: () => void) => enters.push([el, done]),
      onItemLeave: (el: Element, done: () => void) => leaves.push([el, done]),
    },
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  // Rendering FileUpload directly (not through a fixture) needs one tick before
  // useFileDrop's useEventListener-attached drop handler is actually wired up.
  await nextTick()
  const dropzone = screen.container.querySelector('.ui-file-upload-dropzone')!
  const items = () => screen.container.querySelectorAll('.ui-file-upload-item')

  // The very first item, dropped into an empty list, mounts the TransitionGroup
  // itself (v-if="modelValue.length > 0") — Vue skips enter transitions on a
  // TransitionGroup's own initial mount without `appear`, so it never fires. Settle
  // fully (matching the dedupe test's own proven pattern) before the second drop,
  // which is what actually exercises an enter on an already-mounted group.
  dropOn(dropzone, [makeFile('a.txt', 'text/plain', 10)])
  await vi.waitFor(() => expect(items()).toHaveLength(1))
  dropOn(dropzone, [makeFile('b.txt', 'text/plain', 10)])
  await vi.waitFor(() => expect(enters).toHaveLength(1))
  const [enterEl, enterDone] = enters[0]!
  expect(enterEl.tagName).toBe('LI')
  enterDone() // consumer's own animation "finished" — must not throw

  const removeButton = screen.container.querySelector<HTMLButtonElement>('.ui-file-upload-remove')!
  removeButton.click()
  await vi.waitFor(() => expect(leaves).toHaveLength(1))
  const [leaveEl, leaveDone] = leaves[0]!
  expect(leaveEl.tagName).toBe('LI')
  leaveDone()
})

test('browse click opens the file picker via the hidden input', async () => {
  const screen = render(FileUploadFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="basic"] .ui-file-upload-input',
  )!
  const clickSpy = vi.spyOn(input, 'click')
  const button = screen.container.querySelector<HTMLButtonElement>(
    '[data-testid="basic"] .ui-button',
  )!

  button.click()

  expect(clickSpy).toHaveBeenCalled()
})

test('a programmatic drop updates the model', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick() // useFileDrop's dragenter/drop listeners attach via a watched template ref — one tick after mount
  const dropzone = screen.container.querySelector('[data-testid="basic"] .ui-file-upload-dropzone')!
  dropOn(dropzone, [makeFile('a.txt', 'text/plain', 10)])

  await expect.element(screen.getByTestId('count')).toHaveTextContent('1')
})

test('accept rejects non-matching files and does not add them', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector(
    '[data-testid="accept"] .ui-file-upload-dropzone',
  )!
  dropOn(dropzone, [makeFile('doc.pdf', 'application/pdf', 10)])

  await expect.element(screen.getByTestId('accept-rejects')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('accept-count')).toHaveTextContent('0')
})

test('maxSize rejects oversized files', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector(
    '[data-testid="maxsize"] .ui-file-upload-dropzone',
  )!
  dropOn(dropzone, [makeFile('big.bin', 'application/octet-stream', 1000)])

  await expect.element(screen.getByTestId('maxsize-rejects')).toHaveTextContent('1')
})

test('maxFiles rejects files past the cap and stops adding once full', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector(
    '[data-testid="maxfiles"] .ui-file-upload-dropzone',
  )!
  dropOn(dropzone, [makeFile('one.txt', 'text/plain', 5), makeFile('two.txt', 'text/plain', 5)])

  await expect.element(screen.getByTestId('maxfiles-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('maxfiles-rejects')).toHaveTextContent('1')
})

test('dedupe: dropping the same file twice only adds it once, silently', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector(
    '[data-testid="dedupe"] .ui-file-upload-dropzone',
  )!
  const file = makeFile('same.txt', 'text/plain', 5)
  dropOn(dropzone, [file])
  await expect.element(screen.getByTestId('dedupe-count')).toHaveTextContent('1')
  dropOn(dropzone, [file])

  // Give the second drop a moment to (not) change anything, then assert it stayed at 1.
  await vi.waitFor(() => expect(screen.getByTestId('dedupe-count').element().textContent).toBe('1'))
})

test('remove button removes the file from the model', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector('[data-testid="basic"] .ui-file-upload-dropzone')!
  dropOn(dropzone, [makeFile('a.txt', 'text/plain', 10)])
  await expect.element(screen.getByTestId('count')).toHaveTextContent('1')

  const removeBtn = screen.container.querySelector<HTMLButtonElement>(
    '[data-testid="basic"] .ui-file-upload-remove',
  )!
  removeBtn.click()

  await expect.element(screen.getByTestId('count')).toHaveTextContent('0')
})

test('drag-over state survives nested-child dragenter/dragleave churn', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector('[data-testid="basic"] .ui-file-upload-dropzone')!
  const child = dropzone.querySelector('p, button')!
  const dataTransfer = new DataTransfer()

  dropzone.dispatchEvent(dragEventWithFiles('dragenter', dataTransfer))
  await vi.waitFor(() => expect(dropzone.hasAttribute('data-drag-over')).toBe(true))

  // Pointer moves from the dropzone onto nested content: the browser fires
  // enter-on-child then leave-on-dropzone, a boundary-crossing churn that
  // must NOT flicker the state back to false.
  child.dispatchEvent(dragEventWithFiles('dragenter', dataTransfer))
  dropzone.dispatchEvent(dragEventWithFiles('dragleave', dataTransfer))
  await vi.waitFor(() => expect(dropzone.hasAttribute('data-drag-over')).toBe(true))

  child.dispatchEvent(dragEventWithFiles('dragleave', dataTransfer))
  dropzone.dispatchEvent(dragEventWithFiles('dragleave', dataTransfer))
  await vi.waitFor(() => expect(dropzone.hasAttribute('data-drag-over')).toBe(false))
})

test('#item slot swap renders inside the library-owned <li>', async () => {
  const screen = render(FileUploadFixture, {})
  await nextTick()
  const dropzone = screen.container.querySelector(
    '[data-testid="itemslot"] .ui-file-upload-dropzone',
  )!
  dropOn(dropzone, [makeFile('slot.txt', 'text/plain', 5)])

  await vi.waitFor(() => {
    const li = screen.container.querySelector('[data-testid="itemslot"] .ui-file-upload-item')
    expect(li).not.toBeNull()
    const custom = li!.querySelector('[data-testid="custom-item"]')
    expect(custom).not.toBeNull()
    expect(custom!.textContent).toBe('slot.txt')
  })
})

test('form participation: the real file input carries the given name', async () => {
  const screen = render(FileUploadFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="form-upload"] .ui-file-upload-input',
  )!
  expect(input.name).toBe('attachments')
})
