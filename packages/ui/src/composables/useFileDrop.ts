import { shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ElRef } from './dom'

export interface UseFileDropOptions {
  /** Called with the dropped `File[]` — validation (accept/maxSize/maxFiles) is the caller's job. */
  onFiles: (files: File[]) => void
  disabled?: MaybeRefOrGetter<boolean>
  /** Also takes files pasted with Ctrl/Cmd+V while focus is inside the target or the pointer is over it. @default false */
  paste?: MaybeRefOrGetter<boolean>
}

export interface UseFileDropReturn {
  isDragOver: Ref<boolean>
}

// Minimal shape of the File and Directory Entries API, which TypeScript's DOM lib types loosely.
interface Entry {
  isFile: boolean
  isDirectory: boolean
  file?: (resolve: (file: File) => void, reject: (error: unknown) => void) => void
  createReader?: () => {
    readEntries: (resolve: (entries: Entry[]) => void, reject: (error: unknown) => void) => void
  }
}

// Every file in a dropped folder, subfolders included.
async function filesIn(entry: Entry): Promise<File[]> {
  if (entry.isFile && entry.file) {
    return new Promise<File>((resolve, reject) => entry.file!(resolve, reject)).then(
      (file) => [file],
      () => [],
    )
  }
  if (!entry.isDirectory || !entry.createReader) return []
  const reader = entry.createReader()
  const children: Entry[] = []
  // readEntries hands back a batch at a time, then an empty one.
  for (;;) {
    const batch = await new Promise<Entry[]>((resolve) =>
      reader.readEntries(resolve, () => resolve([])),
    )
    if (batch.length === 0) break
    children.push(...batch)
  }
  return (await Promise.all(children.map(filesIn))).flat()
}

const isEditable = (node: EventTarget | null) =>
  node instanceof HTMLElement &&
  (node.isContentEditable || node.matches('input:not([type="file"]), textarea, select'))

export function useFileDrop(
  targetEl: ElRef<HTMLElement | null>,
  options: UseFileDropOptions,
): UseFileDropReturn {
  const isDragOver = shallowRef(false)
  let depth = 0

  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }
  // Only a drag carrying files makes this a drop target; selected text or a link doesn't.
  function carriesFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files')
  }
  function reset() {
    depth = 0
    isDragOver.value = false
  }

  function onDragEnter(event: DragEvent) {
    if (isDisabled() || !carriesFiles(event)) return
    event.preventDefault()
    depth++
    isDragOver.value = true
  }
  function onDragOver(event: DragEvent) {
    if (isDisabled() || !carriesFiles(event)) return
    event.preventDefault()
  }
  // Leaving and dropping are tracked even while disabled, so a drag that started before can't
  // leave the zone stuck in its drag-over state.
  function onDragLeave() {
    depth = Math.max(0, depth - 1)
    if (depth === 0) isDragOver.value = false
  }
  function onDrop(event: DragEvent) {
    reset()
    if (isDisabled() || !carriesFiles(event)) return
    event.preventDefault()
    const transfer = event.dataTransfer
    // The drop's items are only readable now, so take each entry before walking any folder.
    const items = Array.from(transfer?.items ?? []).filter((item) => item.kind === 'file')
    const entries = items.map((item) => item.webkitGetAsEntry?.() as Entry | null | undefined)
    if (entries.some((entry) => entry?.isDirectory)) {
      const pending = entries.map((entry, i) =>
        entry?.isDirectory ? filesIn(entry) : Promise.resolve([items[i]!.getAsFile()!]),
      )
      void Promise.all(pending).then((lists) => {
        const files = lists.flat().filter(Boolean)
        if (files.length > 0 && !isDisabled()) options.onFiles(files)
      })
      return
    }
    const files = Array.from(transfer?.files ?? [])
    if (files.length > 0) options.onFiles(files)
  }
  watch(isDisabled, (disabled) => disabled && reset())

  useEventListener(targetEl, 'dragenter', onDragEnter)
  useEventListener(targetEl, 'dragover', onDragOver)
  useEventListener(targetEl, 'dragleave', onDragLeave)
  useEventListener(targetEl, 'drop', onDrop)

  // Paste: from focus inside the target, or anywhere but a text field while the pointer is over it.
  const hovered = shallowRef(false)
  function onPaste(event: ClipboardEvent) {
    if (!toValue(options.paste) || isDisabled()) return
    const files = Array.from(event.clipboardData?.files ?? [])
    if (files.length === 0) return
    event.preventDefault()
    options.onFiles(files)
  }
  useEventListener(targetEl, 'paste', onPaste)
  useEventListener(targetEl, 'pointerenter', () => (hovered.value = !!toValue(options.paste)))
  useEventListener(targetEl, 'pointerleave', () => (hovered.value = false))
  useEventListener(
    () => (hovered.value ? document : null),
    'paste',
    (event: ClipboardEvent) => {
      if (!hovered.value || isEditable(event.target)) return
      if (toValue(targetEl)?.contains(event.target as Node)) return
      onPaste(event)
    },
  )

  return { isDragOver }
}
