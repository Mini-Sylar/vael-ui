<template>
  <div
    class="ui-confirm-popover"
    role="alertdialog"
    :aria-labelledby="titleId"
    :aria-describedby="description ? descriptionId : undefined"
  >
    <p :id="titleId" class="ui-confirm-popover-title">{{ title }}</p>
    <p v-if="description" :id="descriptionId" class="ui-confirm-popover-description">
      {{ description }}
    </p>
    <component :is="body" v-if="body" v-bind="bodyProps" />
    <div ref="actions" class="ui-confirm-popover-actions">
      <Button
        size="sm"
        variant="outline"
        @click="handleCancel"
        v-bind="cancelButtonProps"
        :disabled="pending || cancelButtonProps?.disabled"
        >{{ cancelLabel }}</Button
      >
      <Button
        size="sm"
        :variant="variant"
        loading="auto"
        @click="handleConfirm"
        v-bind="confirmButtonProps"
        >{{ confirmLabel }}</Button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import '../shared/confirm-popover.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { onMounted, onUnmounted, shallowRef, useId, useTemplateRef, type Component } from 'vue'
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

// Cancelling after confirm already started would report a result the action contradicts.
const pending = shallowRef(false)
const popoverRef = usePopoverRef<unknown, boolean>()
const titleId = useId()
const descriptionId = useId()

// Focus starts on Cancel, the safe choice, once the panel is placed (hidden until then, so retry per frame).
const actions = useTemplateRef<HTMLElement>('actions')
let frame: number | undefined
onMounted(() => {
  let tries = 0
  const focusCancel = () => {
    frame = undefined
    const cancel = actions.value?.querySelector<HTMLElement>('button')
    if (!cancel) return
    cancel.focus({ preventScroll: true })
    if (document.activeElement !== cancel && ++tries < 30)
      frame = requestAnimationFrame(focusCancel)
  }
  focusCancel()
})
onUnmounted(() => frame !== undefined && cancelAnimationFrame(frame))

async function handleConfirm() {
  if (!props.onConfirmAction) {
    popoverRef.close(true)
    return
  }
  pending.value = true
  try {
    await props.onConfirmAction()
    popoverRef.close(true)
  } catch (err) {
    props.onErrorAction?.(err)
  } finally {
    pending.value = false
  }
}
function handleCancel() {
  if (pending.value) return
  props.onCancelAction?.()
  popoverRef.close(false)
}
</script>
