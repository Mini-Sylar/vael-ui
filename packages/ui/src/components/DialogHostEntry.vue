<template>
  <Dialog ref="dialog" v-bind="entry.dialogProps" v-model:open="entry.open">
    <component :is="entry.component" v-bind="entry.componentProps" />
    <template v-if="entry.footer" #footer>
      <component :is="entry.footer" v-bind="entry.footerProps" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, provide, reactive, useTemplateRef, watch } from 'vue'
import Dialog from './Dialog.vue'
import { dialogRefKey } from '../composables/useDialogService'
import type { DynamicDialogEntry } from '../composables/useDialogService'

const props = defineProps<{ entry: DynamicDialogEntry }>()

const dialogInstance = useTemplateRef('dialog')
const panelEl = computed(() => dialogInstance.value?.panelEl ?? null)
watch(panelEl, (el) => {
  props.entry.panelEl = el
})

provide(
  dialogRefKey,
  reactive({
    data: props.entry.data,
    panelEl,
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
</script>
