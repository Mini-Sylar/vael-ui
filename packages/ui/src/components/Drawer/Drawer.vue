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
  /** Which viewport edge the panel slides in from. */
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

/** Whether the drawer is open. */
const open = defineModel<boolean>('open', { default: false })
/** Whether the panel currently fills the viewport. Self-managed by Dialog's built-in toggle unless the consumer binds it. */
const maximized = defineModel<boolean>('maximized', { default: false })

const props = withDefaults(defineProps<DrawerProps>(), {
  side: 'right',
  size: 'md',
  role: 'dialog',
  showClose: true,
  modal: true,
  closeOnEsc: true,
  closeOnOverlay: true,
  forceMount: false,
  scrollFade: true,
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
}>()

defineSlots<{
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
  }): unknown
  header(props: { close: () => void }): unknown
  footer(props: { close: () => void }): unknown
}>()

const dialog = useTemplateRef('dialog')
defineExpose({
  panelEl: computed(() => dialog.value?.panelEl ?? null),
  isClosing: computed(() => dialog.value?.isClosing ?? false),
  close: () => dialog.value?.close(),
  cancelClose: () => dialog.value?.cancelClose(),
})
</script>
