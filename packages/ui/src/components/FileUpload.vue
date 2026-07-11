<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" :data-state="dataState">
    <div
      ref="dropzoneEl"
      :class="dropzonePart.class"
      :style="dropzonePart.style"
      :data-drag-over="isDragOver || undefined"
      @click="onDropzoneClick"
    >
      <slot :is-drag-over="isDragOver" :browse="browse">
        <p class="ui-file-upload-text">{{ messages.fileUpload.drop }}</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          :ui="{ root: themedUi()?.browse }"
          :disabled="isDisabled"
          @click="browse"
        >
          {{ messages.fileUpload.browse }}
        </Button>
      </slot>
    </div>

    <input
      ref="inputEl"
      :id="fieldControl.id"
      type="file"
      class="ui-file-upload-input"
      :accept="accept"
      :multiple="multiple"
      :name="name"
      :disabled="isDisabled"
      :aria-describedby="fieldControl.describedBy()"
      :aria-required="fieldControl.required() || undefined"
      @change="onInputChange"
      @focus="fieldControl.onFocus"
      @blur="fieldControl.onBlur"
    />

    <TransitionGroup
      v-if="modelValue.length > 0"
      tag="ul"
      name="ui-file-item"
      :class="listPart.class"
      :style="listPart.style"
    >
      <li
        v-for="(file, index) in modelValue"
        :key="fileKey(file)"
        :class="itemPart.class"
        :style="[itemPart.style, staggerStyle(file)]"
      >
        <slot name="item" :file="file" :remove="() => removeFile(file)" :index="index">
          <span class="ui-file-upload-item-name">{{ file.name }}</span>
          <span class="ui-file-upload-item-size">{{ formatSize(file.size) }}</span>
          <button
            type="button"
            :class="removePart.class"
            :style="removePart.style"
            :aria-label="`${messages.fileUpload.remove} ${file.name}`"
            @click="removeFile(file)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </slot>
      </li>
    </TransitionGroup>
  </div>
</template>

<!--
  Validates File[] model only (no HTTP/auto-upload/progress chrome).
  Dropzone + hidden input (via useFileDrop, headless and reusable) + accept/maxSize/maxFiles validation.
  input: sr-only (not display:none) for form participation; Browse button + dropzone are alternate entry points.
  Rows animate via TransitionGroup (opacity fade, staggered per-batch); consumers own #item slot + model.
  Comments outside template to avoid DOM nodes in production.
-->
<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import Button from './Button.vue'
import { useFieldControl } from '../composables/useFieldControl'
import { useFileDrop } from '../composables/useFileDrop'
import { useUiMessages } from '../messages'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

export type FileRejectReason = 'accept' | 'maxSize' | 'maxFiles'

const modelValue = defineModel<File[]>('files', { default: () => [] })

const props = withDefaults(
  defineProps<{
    /** Native `accept` syntax: `.pdf`, `image/png`, `image/*`, comma-separated. */
    accept?: string
    multiple?: boolean
    maxSize?: number
    maxFiles?: number
    disabled?: boolean
    name?: string
    ui?: Partial<{
      root: UiPartValue
      dropzone: UiPartValue
      browse: UiPartValue
      list: UiPartValue
      item: UiPartValue
      remove: UiPartValue
    }>
  }>(),
  { multiple: true, disabled: false },
)

const emit = defineEmits<{
  reject: [{ file: File; reason: FileRejectReason }]
  add: [files: File[]]
  remove: [file: File]
}>()

defineSlots<{
  /** Replaces the dropzone's inner content; the library keeps the dropzone element + drag wiring. */
  default(props: { isDragOver: boolean; browse: () => void }): unknown
  /** Replaces one file row's content; the library keeps the `<li>`. */
  item(props: { file: File; remove: () => void; index: number }): unknown
}>()

const messages = useUiMessages()
const fieldControl = useFieldControl({ filled: () => modelValue.value.length > 0 })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

const hadReject = shallowRef(false)
const dataState = computed(() => (hadReject.value || fieldControl.invalid() ? 'invalid' : 'idle'))

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

// Stagger per-batch (position in THIS drop/pick), not v-for index; capped so large batches don't wait too long.
const STAGGER_CAP = 8
const staggerIndex = new Map<string, number>()
function staggerStyle(file: File) {
  return { '--ui-file-item-index': staggerIndex.get(fileKey(file)) ?? 0 }
}

function matchesAccept(file: File, accept: string): boolean {
  const patterns = accept
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (patterns.length === 0) return true
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern.toLowerCase())
    if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1))
    return file.type === pattern
  })
}

const UNITS: Array<[number, string]> = [
  [1e9, 'gigabyte'],
  [1e6, 'megabyte'],
  [1e3, 'kilobyte'],
]
function formatSize(bytes: number): string {
  for (const [threshold, unit] of UNITS) {
    if (bytes >= threshold) {
      return new Intl.NumberFormat(undefined, {
        style: 'unit',
        unit,
        unitDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(bytes / threshold)
    }
  }
  return `${bytes} B`
}

function processFiles(incoming: File[]) {
  if (isDisabled.value) return
  const existing = modelValue.value
  // Without multiple: only first file considered (mirrors native <input> behavior on multi-file drop).
  const pool = props.multiple ? incoming : incoming.slice(0, 1)
  const limit = props.maxFiles ?? (props.multiple ? Infinity : 1)
  const seenKeys = new Set(existing.map(fileKey))
  const accepted: File[] = []
  let rejected = false

  for (const file of pool) {
    if (props.accept && !matchesAccept(file, props.accept)) {
      emit('reject', { file, reason: 'accept' })
      rejected = true
      continue
    }
    if (props.maxSize !== undefined && file.size > props.maxSize) {
      emit('reject', { file, reason: 'maxSize' })
      rejected = true
      continue
    }
    const key = fileKey(file)
    if (seenKeys.has(key)) continue // silent dedupe, not a rejection
    const projectedCount = (props.multiple ? existing.length : 0) + accepted.length
    if (projectedCount >= limit) {
      emit('reject', { file, reason: 'maxFiles' })
      rejected = true
      continue
    }
    seenKeys.add(key)
    accepted.push(file)
  }

  hadReject.value = rejected
  if (accepted.length === 0) return
  accepted.forEach((file, i) => staggerIndex.set(fileKey(file), Math.min(i, STAGGER_CAP - 1)))
  modelValue.value = props.multiple ? [...existing, ...accepted] : accepted
  emit('add', accepted)
}

function removeFile(file: File) {
  staggerIndex.delete(fileKey(file))
  modelValue.value = modelValue.value.filter((f) => f !== file)
  emit('remove', file)
}

const root = useTemplateRef<HTMLElement>('root')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const dropzoneEl = useTemplateRef<HTMLElement>('dropzoneEl')

function browse() {
  if (isDisabled.value) return
  inputEl.value?.click()
}

// Skip if target is already interactive to avoid double-open.
function onDropzoneClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select, textarea, [tabindex]')) return
  browse()
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  processFiles(Array.from(target.files ?? []))
  target.value = '' // so picking the identical file again still fires change
}

const { isDragOver } = useFileDrop(dropzoneEl, {
  onFiles: processFiles,
  disabled: () => isDisabled.value,
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.fileUpload,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-file-upload',
    isDisabled.value && 'ui-file-upload--disabled',
  ),
)
const dropzonePart = computed(() =>
  resolveUiPart(cx, themedUi()?.dropzone, 'ui-file-upload-dropzone'),
)
const listPart = computed(() => resolveUiPart(cx, themedUi()?.list, 'ui-file-upload-list'))
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-file-upload-item'))
const removePart = computed(() => resolveUiPart(cx, themedUi()?.remove, 'ui-file-upload-remove'))

defineExpose({ el: root, dropzoneEl, inputEl, browse })
</script>
