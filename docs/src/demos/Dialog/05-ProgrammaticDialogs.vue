<template>
  <section class="demo">
    <h3>Programmatic dialogs and focus control</h3>
    <p class="note">
      “Delete workspace” has no template: <code>openDialog()</code> renders a component inside a
      real <code>&lt;Dialog&gt;</code>, through the one <code>&lt;DialogHost /&gt;</code> mounted in
      <code>App.vue</code>, as with <code>&lt;Toaster /&gt;</code>.
      <code>await result</code> returns the value the component passed to
      <code>dialogRef.close(value)</code>. It also sets <code>role="alertdialog"</code>, the ARIA
      role for a confirmation, which screen readers announce more urgently than
      <code>role="dialog"</code>.
    </p>
    <p class="note">
      “Reset settings” puts Delete before Cancel in the DOM, so the default, focusing the first
      focusable element, would focus the destructive action. <code>initialFocus</code> points it at
      Cancel instead.
    </p>
    <p class="note">
      “Rotate API key” sets <code>closeOnEsc</code>, <code>closeOnOverlay</code> and
      <code>showClose</code> to <code>false</code>, so Escape, clicking outside and the × don’t
      close it. The only way out is to check the acknowledgement and click Continue, which calls
      <code>dialogRef.close()</code>.
    </p>
    <div class="row">
      <Button variant="outline" @click="openDynamicConfirm">Delete workspace</Button>
      <Button variant="outline" @click="openDangerFirstConfirm">Reset settings</Button>
      <Button variant="outline" @click="openRequiredAction">Rotate API key</Button>
    </div>
    <p v-if="dynamicResult" class="demo-status">
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
