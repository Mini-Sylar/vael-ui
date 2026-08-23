<template>
  <section class="demo">
    <h3>Programmatic dialogs and focus control</h3>
    <p class="note">
      "Delete workspace" never touches a template at all: <code>openDialog()</code> loads a
      component straight into a real <code>&lt;Dialog&gt;</code>, rendered by the single
      <code>&lt;DialogHost /&gt;</code> mounted once in <code>App.vue</code> (same rule as
      <code>&lt;Toaster /&gt;</code>). <code>await result</code> gets back whatever the loaded
      component's own <code>dialogRef.close(value)</code> passed. It also sets
      <code>role="alertdialog"</code>, the correct ARIA role for a confirmation, announced more
      assertively than plain <code>role="dialog"</code>.
    </p>
    <p class="note">
      "Reset settings" deliberately renders Delete before Cancel in the DOM, so the library's
      default "focus the first focusable element" would land on the destructive action, then
      overrides it with <code>initialFocus</code> pointed at the Cancel button instead.
    </p>
    <p class="note">
      "Rotate API key" sets <code>closeOnEsc</code>, <code>closeOnOverlay</code>, and
      <code>showClose</code> to <code>false</code>: Escape, clicking outside, and the × are all
      disabled. The only way out is checking the acknowledgement and clicking Continue, which calls
      <code>dialogRef.close()</code> itself.
    </p>
    <div class="row">
      <Button variant="outline" @click="openDynamicConfirm">Delete workspace</Button>
      <Button variant="outline" @click="openDangerFirstConfirm">Reset settings</Button>
      <Button variant="outline" @click="openRequiredAction">Rotate API key</Button>
    </div>
    <p v-if="dynamicResult" class="note">
      <strong>{{ dynamicResult }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, openDialog } from 'vael-ui'
import type { OpenDialogHandle } from 'vael-ui'
import ConfirmDialogContent from './ConfirmDialogContent.vue'
import type { ConfirmDialogData } from './ConfirmDialogContent.vue'
import RequiredActionDialogContent from './RequiredActionDialogContent.vue'
import type { RequiredActionData } from './RequiredActionDialogContent.vue'

const dynamicResult = shallowRef<string | null>(null)
async function openDynamicConfirm() {
  const { result } = openDialog<ConfirmDialogData, boolean>(ConfirmDialogContent, {
    data: { message: 'Delete this workspace? This cannot be undone.' },
    title: 'Delete workspace',
    size: 'sm',
    role: 'alertdialog',
  })
  const confirmed = await result
  dynamicResult.value = confirmed ? 'Confirmed: workspace deleted.' : 'Cancelled: nothing happened.'
}

async function openDangerFirstConfirm() {
  const handle: OpenDialogHandle<boolean> = openDialog<ConfirmDialogData, boolean>(
    ConfirmDialogContent,
    {
      data: { message: 'Reset all settings to defaults?', dangerFirst: true },
      title: 'Reset settings',
      size: 'sm',
      role: 'alertdialog',
      initialFocus: () =>
        handle.panelEl.value?.querySelector<HTMLElement>('[data-role="cancel"]') ?? undefined,
    },
  )
  const confirmed = await handle.result
  dynamicResult.value = confirmed ? 'Confirmed: settings reset.' : 'Cancelled: nothing happened.'
}

function openRequiredAction() {
  openDialog<RequiredActionData, boolean>(RequiredActionDialogContent, {
    data: {
      message: 'Rotate the workspace API key? Old integrations will stop working immediately.',
    },
    title: 'Rotate API key',
    size: 'sm',
    closeOnEsc: false,
    closeOnOverlay: false,
    showClose: false,
  })
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
