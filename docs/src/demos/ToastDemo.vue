<template>
  <section class="demo">
    <h2>Toast</h2>
    <p class="note">
      Sonner-style: no hooks, no context. <code>toast()</code> is a plain function callable from
      anywhere, rendered by the single <code>&lt;Toaster /&gt;</code> mounted once in
      <code>App.vue</code>. Hover the stack to pause every timer with the exact remaining time
      preserved (not a restart) and expand it into a full list; switching tabs does the same. Drag a
      card left, right, or toward its anchored edge to swipe-dismiss it.
    </p>

    <h3>Variants</h3>
    <div class="row">
      <Button @click="toast('Simple notification')">Default</Button>
      <Button variant="secondary" @click="toast.success('Changes saved')">Success</Button>
      <Button variant="secondary" @click="toast.error('Could not save changes')">Error</Button>
      <Button variant="secondary" @click="toast.warning('Storage almost full')">Warning</Button>
      <Button variant="secondary" @click="toast.info('New version available')">Info</Button>
    </div>

    <h3>Promise-based</h3>
    <p class="note">
      <code>toast.promise</code> renders a loading toast immediately, then swaps its content once
      the promise settles, success or error.
    </p>
    <div class="row">
      <Button
        variant="outline"
        @click="
          toast.promise(fakeSave, {
            loading: 'Saving…',
            success: 'Saved successfully',
            error: 'Failed to save',
          })
        "
      >
        Save (resolves)
      </Button>
      <Button
        variant="outline"
        @click="
          toast.promise(fakeFailingSave, {
            loading: 'Saving…',
            success: 'Saved successfully',
            error: (e) => `Failed: ${(e as Error).message}`,
          })
        "
      >
        Save (fails)
      </Button>
    </div>

    <h3>Actions and stacking</h3>
    <p class="note">
      A toast can carry a trailing action button of its own. Fire several in a row to see the stack
      grow, hover to pause every timer at once.
    </p>
    <div class="row">
      <Button
        variant="ghost"
        @click="
          toast('Undo available', {
            action: { label: 'Undo', onClick: () => toast.success('Undone') },
          })
        "
      >
        With action
      </Button>
      <Button variant="ghost" @click="fireMany">Stack several</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, toast } from 'vael-ui'

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1800))
const fakeFailingSave = () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('network')), 1800))

let count = 0
function fireMany() {
  count++
  toast(`Notification ${count}`, { description: 'Hover the stack to pause auto-dismiss.' })
}
</script>
