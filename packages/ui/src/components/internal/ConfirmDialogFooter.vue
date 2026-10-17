<template>
  <Button
    variant="outline"
    @click="handleCancel"
    v-bind="cancelButtonProps"
    :disabled="pending || cancelButtonProps?.disabled"
    >{{ cancelLabel }}</Button
  >
  <!-- loading="auto": handleConfirm returning a promise is enough for Button to show/guard the pending state itself. -->
  <Button :variant="variant" loading="auto" @click="handleConfirm" v-bind="confirmButtonProps">{{
    confirmLabel
  }}</Button>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import type { ComponentProps } from 'vue-component-type-helpers'
import Button from '../Button/Button.vue'
import type { ButtonVariant } from '../Button/Button.vue'
import { useDialogRef } from '../../composables/useDialogService'

type ButtonPropsPartial = Partial<ComponentProps<typeof Button>>

const props = withDefaults(
  defineProps<{
    confirmLabel?: string
    cancelLabel?: string
    variant?: ButtonVariant
    confirmButtonProps?: ButtonPropsPartial
    cancelButtonProps?: ButtonPropsPartial
    onConfirmAction?: () => unknown | Promise<unknown>
    onCancelAction?: () => void
    onErrorAction?: (error: unknown) => void
  }>(),
  { confirmLabel: 'Confirm', cancelLabel: 'Cancel', variant: 'primary' },
)

// Cancelling after confirm already started would report a result the action contradicts.
const pending = shallowRef(false)
const dialogRef = useDialogRef<unknown, boolean>()

async function handleConfirm() {
  if (!props.onConfirmAction) {
    dialogRef.close(true)
    return
  }
  pending.value = true
  try {
    await props.onConfirmAction()
    dialogRef.close(true)
  } catch (err) {
    props.onErrorAction?.(err)
  } finally {
    pending.value = false
  }
}
function handleCancel() {
  if (pending.value) return
  props.onCancelAction?.()
  dialogRef.close(false)
}
</script>
