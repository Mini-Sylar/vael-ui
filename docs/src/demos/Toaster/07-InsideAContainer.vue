<template>
  <section class="demo">
    <h3>Inside a container</h3>
    <p class="note">
      <code>container</code> keeps a Toaster inside an element instead of the viewport: it teleports
      there and stacks in that element's corner, as <code>container</code> does on Dialog and
      Popover. The element needs <code>position: relative</code>. This Toaster has its own
      <code>name</code>, so the page's main Toaster never shows its toasts.
    </p>
    <div ref="frame" class="frame">
      <div class="row">
        <Button @click="send">Send a toast</Button>
        <Button variant="secondary" @click="sendThree">Send three</Button>
      </div>
      <Toaster name="frame" aria-label="Frame notifications" :container="frame" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Button, Toaster, toast } from 'vael-ui'

const frame = useTemplateRef<HTMLElement>('frame')
const messages = ['Draft saved', 'Invite sent to Sam', 'Build passed', 'Backup complete']
let count = 0

function send() {
  toast.success(messages[count++ % messages.length], { toaster: 'frame' })
}
function sendThree() {
  for (let i = 0; i < 3; i++) send()
}
</script>

<style scoped>
.frame {
  position: relative;
  min-block-size: 16rem;
  padding: 1rem;
  border: 1px dashed var(--ui-border);
  border-radius: var(--ui-radius);
  overflow: hidden;
}
</style>
