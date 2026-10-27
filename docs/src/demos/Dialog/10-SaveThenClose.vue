<template>
  <section class="demo">
    <h3>Save, show the result, then close</h3>
    <p class="note">
      A hint fades in once the panel has arrived. Save shows a loader while the request runs, then
      turns green with a tick or red. Once the tick has drawn in, the dialog closes and a toast
      confirms. Under reduced motion every wait resolves at once, so the flow still finishes.
    </p>
    <Button @click="open = true">Edit profile</Button>

    <Dialog
      v-model:open="open"
      title="Edit profile"
      :motion="motion"
      @after-leave="status = 'idle'"
    >
      <template #default="{ target }">
        <!-- `target('hint')` is checked against `motion.targets`: a typo is a type error. -->
        <p :ref="target('hint')" class="hint">Your name shows on every workspace you're in.</p>
        <Input v-model="name" aria-label="Name" />
        <label class="fail">
          <input v-model="failNext" type="checkbox" />
          Make the next save fail
        </label>
      </template>

      <template #footer>
        <Button
          loading="auto"
          :variant="status === 'failed' ? 'danger' : 'primary'"
          :class="{ saved: status === 'saved' }"
          @click="save"
        >
          <!-- The tick mounts with the result; once it's in, `close` runs. -->
          <template v-if="status === 'saved'" #leading>
            <svg
              v-animate="{
                initial: { scale: 0.25, opacity: 0, blur: 4 },
                duration: 500,
                onAfterEnter: close,
              }"
              viewBox="0 0 16 16"
              width="1em"
              height="1em"
            >
              <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          </template>
          {{ status === 'saved' ? 'Saved' : status === 'failed' ? 'Try again' : 'Save' }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Input, toast } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const name = shallowRef('Ada Lovelace')
const failNext = shallowRef(false)
const status = shallowRef<'idle' | 'saved' | 'failed'>('idle')

// Typed: `after` autocompletes your target names and the dialog's parts. The hint waits for the panel.
const motion: DialogMotion<'hint'> = {
  targets: { hint: { initial: { opacity: 0, y: 8 }, after: 'panel' } },
}

// Stands in for your API: resolves true, or false when the box is ticked.
const request = () => new Promise<boolean>((done) => setTimeout(() => done(!failNext.value), 900))

// `loading="auto"` shows the loader until this resolves; then green with a tick, or red.
async function save() {
  status.value = (await request()) ? 'saved' : 'failed'
}

// The tick's onAfterEnter: it has drawn in.
function close() {
  open.value = false
  toast.success('Profile saved')
}
</script>

<style scoped>
.hint {
  margin: 0 0 0.75rem;
  color: var(--ui-text-muted);
}
.fail {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
  font-size: 0.875rem;
}
/* No success variant: the saved look is the button's own variables. */
.saved {
  --ui-button-bg: var(--ui-success);
  color: var(--ui-success-contrast);
}
</style>
