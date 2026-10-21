import { shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ElRef } from './dom'

export interface UseFileDropOptions {
  /** Called with the dropped `File[]` — validation (accept/maxSize/maxFiles) is the caller's job. */
  onFiles: (files: File[]) => void
  disabled?: MaybeRefOrGetter<boolean>
}

export interface UseFileDropReturn {
  isDragOver: Ref<boolean>
}

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
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) options.onFiles(files)
  }
  watch(isDisabled, (disabled) => disabled && reset())

  useEventListener(targetEl, 'dragenter', onDragEnter)
  useEventListener(targetEl, 'dragover', onDragOver)
  useEventListener(targetEl, 'dragleave', onDragLeave)
  useEventListener(targetEl, 'drop', onDrop)

  return { isDragOver }
}
