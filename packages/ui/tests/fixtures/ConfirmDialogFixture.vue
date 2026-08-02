<template>
  <DialogHost />
  <button data-testid="open-sync" @click="openSync">Open (sync)</button>
  <button data-testid="open-resolve" @click="openResolving">Open (resolving)</button>
  <button data-testid="open-reject" @click="openRejecting">Open (rejecting)</button>
  <button data-testid="settle-resolve" @click="resolveGate?.()">Settle (resolve)</button>
  <button data-testid="settle-reject" @click="rejectGate?.(new Error('boom'))">
    Settle (reject)
  </button>
  <output data-testid="result">{{ resultText }}</output>
  <output data-testid="confirm-calls">{{ confirmCalls }}</output>
  <output data-testid="error-calls">{{ errorCalls }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import DialogHost from '../../src/components/DialogHost.vue'
import { confirmDialog } from '../../src/composables/useDialogService'

const resultText = shallowRef('')
const confirmCalls = shallowRef(0)
const errorCalls = shallowRef(0)

let resolveGate: (() => void) | undefined
let rejectGate: ((err: unknown) => void) | undefined

function openSync() {
  confirmDialog({ title: 'Discard changes?', description: 'You have unsaved edits.' }).result.then(
    (value) => {
      resultText.value = String(value)
    },
  )
}

function openResolving() {
  confirmDialog({
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

function openRejecting() {
  confirmDialog({
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
</script>
