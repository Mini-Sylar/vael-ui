<template>
  <Dialog
    ref="dialog"
    v-model:open="open"
    v-model:maximized="maximized"
    :position="side"
    :size="size"
    :title="title"
    :description="description"
    :role="role"
    :initial-focus="initialFocus"
    :show-close="showClose"
    :modal="modal"
    :close-on-esc="closeOnEsc"
    :close-on-overlay="closeOnOverlay"
    :close-on-history-back="closeOnHistoryBack"
    :before-close="beforeClose"
    :force-mount="forceMount"
    :teleport-to="teleportTo"
    :container="container"
    :scroll-target="scrollTarget"
    :scroll-fade="scrollFade"
    :ui="ui"
    v-bind="$attrs"
    @open-change="(value, details) => emit('open-change', value, details)"
  >
    <template #default="slotProps"><slot v-bind="slotProps" /></template>
    <template v-if="$slots.header" #header="slotProps">
      <slot name="header" v-bind="slotProps" />
    </template>
    <template v-if="$slots.footer" #footer="slotProps">
      <slot name="footer" v-bind="slotProps" />
    </template>
  </Dialog>
</template>

<script lang="ts">
import type { DialogProps } from '../Dialog/Dialog.vue'

/** A drawer always anchors to a viewport edge — `center` is Dialog's own territory. */
export type DrawerSide = 'left' | 'right' | 'top' | 'bottom'

export interface DrawerProps extends Omit<DialogProps, 'position'> {
  /** Which viewport edge the panel slides in from. @default 'right' */
  side?: DrawerSide
}
</script>

<!-- A thin, edge-only view of Dialog: same engine (useDialog, layer stack,
  focus trap, scroll lock), just a narrower API that can't be pointed at
  `position="center"` — that's a plain dialog, not a drawer. -->
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import Dialog from '../Dialog/Dialog.vue'
import type { DialogOpenChangeDetails } from '../../composables/useDialog'

defineOptions({ inheritAttrs: false })

/** Whether the drawer is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/**
 * Whether the panel fills the viewport. Dialog's built-in toggle manages it unless you bind it.
 * @default false
 */
const maximized = defineModel<boolean>('maximized', { default: false })

const props = withDefaults(defineProps<DrawerProps>(), {
  side: 'right',
  size: 'md',
  role: 'dialog',
  showClose: true,
  modal: true,
  closeOnEsc: true,
  closeOnOverlay: true,
  closeOnHistoryBack: false,
  forceMount: false,
  scrollFade: true,
})

const emit = defineEmits<{
  /** Fires before the drawer closes, with the reason. Call `details.cancel()` to keep it open. */
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
}>()

defineSlots<{
  /** Panel content. */
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
  }): unknown
  /** Replaces the default title and description header. */
  header(props: { close: () => void }): unknown
  /** Action row at the end of the panel. */
  footer(props: { close: () => void }): unknown
}>()

const dialog = useTemplateRef('dialog')
defineExpose({
  /** Panel element (null while closed). */
  panelEl: computed(() => dialog.value?.panelEl ?? null),
  /** `true` while a `beforeClose` close is pending. */
  isClosing: computed(() => dialog.value?.isClosing ?? false),
  /** Closes the drawer, running `beforeClose` first. */
  close: () => dialog.value?.close(),
  /** Cancels a close pending in `beforeClose` and keeps the drawer open. */
  cancelClose: () => dialog.value?.cancelClose(),
})
</script>
