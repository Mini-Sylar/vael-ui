<template>
  <Dialog
    ref="dialog"
    v-bind="entry.dialogProps"
    v-model:open="entry.open"
    @after-leave="entry.left?.()"
  >
    <component :is="entry.component" v-bind="entry.componentProps" />
    <template v-if="entry.footer" #footer>
      <component :is="entry.footer" v-bind="entry.footerProps" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, provide, reactive, useTemplateRef, watch } from 'vue'
import Dialog from '../Dialog/Dialog.vue'
import { dialogRefKey } from '../../composables/useDialogService'
import type { DynamicDialogEntry } from '../../composables/useDialogService'

const props = defineProps<{ entry: DynamicDialogEntry }>()

const dialogInstance = useTemplateRef('dialog')
const panelEl = computed(() => dialogInstance.value?.panelEl ?? null)
watch(panelEl, (el) => {
  props.entry.panelEl = el
})
const overlayEl = computed(() => dialogInstance.value?.overlayEl ?? null)
watch(overlayEl, (el) => {
  props.entry.overlayEl = el
})

provide(
  dialogRefKey,
  reactive({
    data: props.entry.data,
    panelEl,
    overlayEl,
    close: props.entry.close,
  }),
)

// Route through Dialog instance to allow custom exit animation before close.
watch(
  () => props.entry.closeRequested,
  (requested) => {
    if (requested) dialogInstance.value?.close()
  },
)
// The entry goes once it has left: on `after-leave`, or at once when nothing is leaving (no
// transition ran, as under a test renderer's stubs, or motion is off).
watch(
  () => props.entry.open,
  async (open) => {
    if (open) return
    await nextTick()
    if (dialogInstance.value?.phase !== 'leaving') props.entry.left?.()
  },
)

// close() called before this mounted: the watch above never saw it change.
onMounted(() => {
  if (props.entry.closeRequested) dialogInstance.value?.close()
})
</script>
