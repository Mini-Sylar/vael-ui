import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, ref } from 'vue'
import FileUpload from '../src/components/FileUpload/FileUpload.vue'

function upload(props: Record<string, unknown> = {}) {
  const files = ref<File[]>([])
  const onReject = vi.fn()
  const Wrapper = defineComponent({
    setup: () => () =>
      h('div', [
        h(FileUpload, {
          ...props,
          files: files.value,
          'onUpdate:files': (value: File[]) => (files.value = value),
          onReject,
        }),
        h('input', { class: 'elsewhere' }),
      ]),
  })
  return { Wrapper, files, onReject }
}

function paste(target: EventTarget, list: File[]) {
  const transfer = new DataTransfer()
  for (const file of list) transfer.items.add(file)
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: transfer })
  target.dispatchEvent(event)
  return event
}

const png = () => new File(['png'], 'shot.png', { type: 'image/png' })
const txt = () => new File(['txt'], 'notes.txt', { type: 'text/plain' })

test('paste: files pasted while Browse has focus are added, through accept', async () => {
  const { Wrapper, files, onReject } = upload({ accept: 'image/*' })
  const screen = await render(Wrapper)
  const browse = screen.container.querySelector<HTMLButtonElement>(
    '.ui-file-upload-dropzone button',
  )!
  browse.focus()
  const event = paste(browse, [png(), txt()])
  await nextTick()
  expect(files.value.map((file) => file.name)).toEqual(['shot.png'])
  expect(onReject).toHaveBeenCalledWith({ file: expect.any(File), reason: 'accept' })
  expect(event.defaultPrevented).toBe(true)
})

test('paste: with the pointer over the dropzone, a paste on the page is taken, but not one in a text field', async () => {
  const { Wrapper, files } = upload()
  const screen = await render(Wrapper)
  const dropzone = screen.container.querySelector<HTMLElement>('.ui-file-upload-dropzone')!
  // Not hovered: the page keeps its paste.
  paste(document.body, [png()])
  await nextTick()
  expect(files.value).toHaveLength(0)

  dropzone.dispatchEvent(new PointerEvent('pointerenter'))
  paste(screen.container.querySelector('.elsewhere')!, [png()])
  await nextTick()
  expect(files.value).toHaveLength(0)
  paste(document.body, [png()])
  await nextTick()
  expect(files.value.map((file) => file.name)).toEqual(['shot.png'])

  dropzone.dispatchEvent(new PointerEvent('pointerleave'))
  paste(document.body, [txt()])
  await nextTick()
  expect(files.value).toHaveLength(1)
})

test('paste: ignored while disabled, and text pastes are left alone', async () => {
  const { Wrapper, files } = upload({ disabled: true })
  const screen = await render(Wrapper)
  const dropzone = screen.container.querySelector<HTMLElement>('.ui-file-upload-dropzone')!
  dropzone.dispatchEvent(new PointerEvent('pointerenter'))
  paste(document.body, [png()])
  await nextTick()
  expect(files.value).toHaveLength(0)

  const active = upload()
  const other = await render(active.Wrapper)
  const browse = other.container.querySelector<HTMLButtonElement>(
    '.ui-file-upload-dropzone button',
  )!
  const event = paste(browse, [])
  expect(event.defaultPrevented).toBe(false)
})

// A stand-in for the File and Directory Entries API, which a test can't make from a real folder.
function fileEntry(file: File) {
  return { isFile: true, isDirectory: false, file: (resolve: (f: File) => void) => resolve(file) }
}
function folderEntry(children: unknown[]) {
  return {
    isFile: false,
    isDirectory: true,
    createReader: () => {
      // Two batches, then empty, as Chromium hands back large folders.
      const batches = [children.slice(0, 1), children.slice(1), []]
      return { readEntries: (resolve: (entries: unknown[]) => void) => resolve(batches.shift()!) }
    },
  }
}

test('drop a folder: its files, subfolders included, go through the same checks', async () => {
  const { Wrapper, files, onReject } = upload({ maxSize: 10 })
  const screen = await render(Wrapper)
  const dropzone = screen.container.querySelector<HTMLElement>('.ui-file-upload-dropzone')!
  const loose = new File(['loose'], 'loose.txt', { type: 'text/plain' })
  const big = new File([new Uint8Array(50)], 'big.bin')
  const folder = folderEntry([
    fileEntry(new File(['a'], 'a.txt')),
    folderEntry([fileEntry(new File(['b'], 'b.txt')), fileEntry(big)]),
  ])
  const transfer = {
    types: ['Files'],
    files: [],
    items: [
      { kind: 'file', webkitGetAsEntry: () => folder, getAsFile: () => null },
      { kind: 'file', webkitGetAsEntry: () => fileEntry(loose), getAsFile: () => loose },
    ],
  }
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: transfer })
  dropzone.dispatchEvent(event)
  await vi.waitFor(() =>
    expect(files.value.map((file) => file.name).sort()).toEqual(['a.txt', 'b.txt', 'loose.txt']),
  )
  expect(onReject).toHaveBeenCalledWith({ file: big, reason: 'maxSize' })
})
