<template>
  <div class="ui-confirm-popover">
    <p class="ui-confirm-popover-title">{{ title }}</p>
    <p v-if="description" class="ui-confirm-popover-description">{{ description }}</p>
    <component :is="body" v-if="body" v-bind="bodyProps" />
    <div class="ui-confirm-popover-actions">
      <Button size="sm" variant="outline" @click="handleCancel" v-bind="cancelButtonProps">{{
        cancelLabel
      }}</Button>
      <Button size="sm" :variant="variant" @click="handleConfirm" v-bind="confirmButtonProps">{{
        confirmLabel
      }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import '../shared/confirm-popover.css'
import '../shared/tokens.css'
import type { Component } from 'vue'
import type { ComponentProps } from 'vue-component-type-helpers'
import Button from '../Button/Button.vue'
import type { ButtonVariant } from '../Button/Button.vue'
import { usePopoverRef } from '../../composables/usePopoverService'

type ButtonPropsPartial = Partial<ComponentProps<typeof Button>>

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    body?: Component
    bodyProps?: Record<string, unknown>
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

const popoverRef = usePopoverRef<unknown, boolean>()

async function handleConfirm() {
  if (!props.onConfirmAction) {
    popoverRef.close(true)
    return
  }
  try {
    await props.onConfirmAction()
    popoverRef.close(true)
  } catch (err) {
    props.onErrorAction?.(err)
  }
}
function handleCancel() {
  props.onCancelAction?.()
  popoverRef.close(false)
}
</script>
