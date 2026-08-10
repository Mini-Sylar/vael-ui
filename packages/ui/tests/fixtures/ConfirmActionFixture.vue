<template>
  <DialogHost />
  <PopoverHost />

  <button data-testid="open-dialog-sync" @click="openDialogSync">Open dialog (sync)</button>
  <button data-testid="open-dialog-resolve" @click="openDialogResolving">
    Open dialog (resolving)
  </button>
  <button data-testid="open-dialog-reject" @click="openDialogRejecting">
    Open dialog (rejecting)
  </button>

  <button ref="popoverTrigger" data-testid="open-popover-sync" @click="openPopoverSync">
    Open popover (sync)
  </button>
  <button ref="popoverTrigger2" data-testid="open-popover-resolve" @click="openPopoverResolving">
    Open popover (resolving)
  </button>
  <button ref="popoverTrigger3" data-testid="open-popover-pinned" @click="openPopoverPinned">
    Open popover (pinned)
  </button>

  <button data-testid="settle-resolve" @click="resolveGate?.()">Settle (resolve)</button>
  <button data-testid="settle-reject" @click="rejectGate?.(new Error('boom'))">
    Settle (reject)
  </button>

  <output data-testid="result">{{ resultText }}</output>
  <output data-testid="confirm-calls">{{ confirmCalls }}</output>
  <output data-testid="error-calls">{{ errorCalls }}</output>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import DialogHost from '../../src/components/DialogHost/DialogHost.vue'
import PopoverHost from '../../src/components/PopoverHost/PopoverHost.vue'
import { confirmAction } from '../../src/composables/confirmAction'

const resultText = shallowRef('')
const confirmCalls = shallowRef(0)
const errorCalls = shallowRef(0)

let resolveGate: (() => void) | undefined
let rejectGate: ((err: unknown) => void) | undefined

const popoverTrigger = useTemplateRef('popoverTrigger')
const popoverTrigger2 = useTemplateRef('popoverTrigger2')
const popoverTrigger3 = useTemplateRef('popoverTrigger3')

function openDialogSync() {
  confirmAction({ title: 'Discard changes?', description: 'You have unsaved edits.' }).result.then(
    (value) => {
      resultText.value = String(value)
    },
  )
}

function openDialogResolving() {
  confirmAction({
    title: 'Delete file?',
    description: 'This cannot be undone.',
    variant: 'danger',
    onConfirm: () =>
      new Promise<void>((resolve) => {
        confirmCalls.value++
        resolveGate = resolve
      }),
  }).result.then((value) => {
    resultText.value = String(value)
  })
}

function openDialogRejecting() {
  confirmAction({
    title: 'Delete file?',
    onConfirm: () =>
      new Promise<void>((_resolve, reject) => {
        confirmCalls.value++
        rejectGate = reject
      }),
    onError: () => {
      errorCalls.value++
    },
  }).result.then((value) => {
    resultText.value = String(value)
  })
}

function openPopoverSync() {
  confirmAction({
    surface: 'popover',
    triggerEl: popoverTrigger.value!,
    title: 'Remove tag?',
  }).result.then((value) => {
    resultText.value = String(value)
  })
}

function openPopoverResolving() {
  confirmAction({
    surface: 'popover',
    triggerEl: popoverTrigger2.value!,
    title: 'Remove tag?',
    onConfirm: () =>
      new Promise<void>((resolve) => {
        confirmCalls.value++
        resolveGate = resolve
      }),
  }).result.then((value) => {
    resultText.value = String(value)
  })
}

// closeOnOutside: false — isolates "are the two queues independent" from
// Popover's own (correct, expected) default of closing on any outside
// click, which a click on an unrelated trigger elsewhere on the page is.
function openPopoverPinned() {
  confirmAction({
    surface: 'popover',
    triggerEl: popoverTrigger3.value!,
    title: 'Remove tag?',
    closeOnOutside: false,
  }).result.then((value) => {
    resultText.value = String(value)
  })
}
</script>
