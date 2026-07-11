<template>
  <section class="demo">
    <h2>Toast</h2>
    <p class="note">
      Sonner-style: no hooks, no context — <code>toast()</code> is a plain function callable from
      anywhere, rendered by the single <code>&lt;Toaster /&gt;</code> mounted once in
      <code>App.vue</code>. Hover the stack to pause every timer with the exact remaining time
      preserved (not a restart) and expand it into a full list; switching tabs does the same. Drag a
      card left, right, or toward its anchored edge to swipe-dismiss it.
    </p>
    <p class="note">
      EXTREME example: pick an engine below to replace the built-in CSS enter/exit entirely — both
      alternatives are wired through the same
      <code>motion-css="false"</code> + <code>@card-enter</code>/<code>@card-leave</code> escape
      hatch (TransitionGroup's own <code>(el, done)</code> hooks, forwarded through the Teleport
      that blocks plain attrs from reaching them). Click "Stack several" fast to see the cascade;
      dismiss one to see the flick-away exit.
    </p>

    <div class="row">
      <label for="toast-position">Position</label>
      <select id="toast-position" v-model="position" class="locale-select">
        <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
      </select>
      <label for="toast-engine">Animation engine</label>
      <select id="toast-engine" v-model="engine" class="locale-select">
        <option v-for="e in engines" :key="e.value" :value="e.value">{{ e.label }}</option>
      </select>
    </div>

    <div class="row">
      <Button @click="toast('Simple notification')">Default</Button>
      <Button variant="secondary" @click="toast.success('Changes saved')">Success</Button>
      <Button variant="secondary" @click="toast.error('Could not save changes')">Error</Button>
      <Button variant="secondary" @click="toast.warning('Storage almost full')">Warning</Button>
      <Button variant="secondary" @click="toast.info('New version available')">Info</Button>
    </div>

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
        toast.promise (resolves)
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
        toast.promise (rejects)
      </Button>
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
import type { ToasterPosition } from 'vael-ui'

const position = defineModel<ToasterPosition>('position', { required: true })
const positions: ToasterPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

const engine = defineModel<'css' | 'gsap' | 'motion-v'>('engine', { required: true })
const engines: Array<{ value: 'css' | 'gsap' | 'motion-v'; label: string }> = [
  { value: 'css', label: 'CSS (default)' },
  { value: 'gsap', label: 'GSAP' },
  { value: 'motion-v', label: 'motion-v' },
]

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1800))
const fakeFailingSave = () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('network')), 1800))

let count = 0
function fireMany() {
  count++
  toast(`Notification ${count}`, { description: 'Hover the stack to pause auto-dismiss.' })
}
</script>
