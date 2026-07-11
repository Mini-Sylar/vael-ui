<template>
  <button type="button" data-testid="vapor-dialog-open" @click="open = true">Open dialog</button>
  <!-- Untouched probe: bound ONLY via useTemplateRef, nothing else writes to
       it. Separate from the real dialog panel below on purpose — re-checks
       a previously-documented bug (App.vue's own comment on `dropzoneEl`):
       on vue 3.6.0-beta.17, useTemplateRef() never resolved for a plain
       element rendered directly by Vapor-compiled markup. -->
  <span ref="probeEl" data-testid="vapor-dialog-probe" style="display: none"></span>
  <output data-testid="vapor-dialog-templateref-resolved">{{
    templateRefResolved ? 'yes' : 'no'
  }}</output>

  <!-- Test-only probe, not the dev-server demo — no visual styling needed; the real Dialog.vue is what dev-main.ts mounts. -->
  <Teleport to="body">
    <div v-if="open" data-testid="vapor-dialog-overlay">
      <div :ref="setPanelEl" data-testid="vapor-dialog-panel" role="dialog" aria-modal="true">
        <p data-testid="vapor-dialog-content">Real Teleport, real useDialog(), pure Vapor.</p>
        <button type="button" data-testid="vapor-dialog-first-focusable">First focusable</button>
        <button type="button" data-testid="vapor-dialog-close" @click="requestClose('trigger')">
          Close
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts" vapor>
// Spike 2: Teleport + the real useDialog() composable (focus trap, scroll
// lock, layer stacking, Escape-to-close) authored as a genuinely Vapor
// component — no interop plugin, no VDOM anywhere in this tree.
import { computed, shallowRef, useTemplateRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useDialog } from 'vael-ui'

const open = shallowRef(false)

const probeEl = useTemplateRef<HTMLElement>('probeEl')
const templateRefResolved = computed(() => probeEl.value != null)

// useDialog's panelEl requirement: a manual callback ref, matching the
// established workaround for the useTemplateRef gap this spike also checks.
const panelEl = shallowRef<HTMLElement | null>(null)
function setPanelEl(el: Element | ComponentPublicInstance | null) {
  panelEl.value = el as HTMLElement | null
}

// Same dual-Vue-instance Ref branding friction documented for `dropzoneTarget`
// in App.vue — this package's own `vue` (3.6.0-rc.1, for Vapor) is a
// separate module instance from the one vael-ui's dist is typed against.
const { requestClose } = useDialog(open as unknown as Parameters<typeof useDialog>[0], {
  panelEl: panelEl as unknown as Parameters<typeof useDialog>[1]['panelEl'],
})
</script>
