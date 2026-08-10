<template>
  <Button variant="outline" @click="handleCancel" v-bind="cancelButtonProps">{{
    cancelLabel
  }}</Button>
  <!-- loading="auto" is Button's own default — handleConfirm returning a promise is enough for it to show/guard the pending state itself. -->
  <Button :variant="variant" @click="handleConfirm" v-bind="confirmButtonProps">{{
    confirmLabel
  }}</Button>
</template>

<script setup lang="ts">
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

const dialogRef = useDialogRef<unknown, boolean>()

async function handleConfirm() {
  if (!props.onConfirmAction) {
    dialogRef.close(true)
    return
  }
  try {
    await props.onConfirmAction()
    dialogRef.close(true)
  } catch (err) {
    props.onErrorAction?.(err)
  }
}
function handleCancel() {
  props.onCancelAction?.()
  dialogRef.close(false)
}
</script>
