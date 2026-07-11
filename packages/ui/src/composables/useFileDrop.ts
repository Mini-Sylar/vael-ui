import { shallowRef, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface UseFileDropOptions {
  /** Called with the dropped `File[]` — validation (accept/maxSize/maxFiles) is the caller's job. */
  onFiles: (files: File[]) => void
  disabled?: MaybeRefOrGetter<boolean>
}

export interface UseFileDropReturn {
  isDragOver: Ref<boolean>
}

export function useFileDrop(
  targetEl: Ref<HTMLElement | null>,
  options: UseFileDropOptions,
): UseFileDropReturn {
  const isDragOver = shallowRef(false)
  let depth = 0

  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }

  function onDragEnter(event: DragEvent) {
    if (isDisabled()) return
    event.preventDefault()
    depth++
    isDragOver.value = true
  }
  function onDragOver(event: DragEvent) {
    if (isDisabled()) return
    event.preventDefault()
  }
  function onDragLeave(event: DragEvent) {
    if (isDisabled()) return
    event.preventDefault()
    depth = Math.max(0, depth - 1)
    if (depth === 0) isDragOver.value = false
  }
  function onDrop(event: DragEvent) {
    if (isDisabled()) return
    event.preventDefault()
    depth = 0
    isDragOver.value = false
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) options.onFiles(files)
  }

  useEventListener(targetEl, 'dragenter', onDragEnter)
  useEventListener(targetEl, 'dragover', onDragOver)
  useEventListener(targetEl, 'dragleave', onDragLeave)
  useEventListener(targetEl, 'drop', onDrop)

  return { isDragOver }
}
