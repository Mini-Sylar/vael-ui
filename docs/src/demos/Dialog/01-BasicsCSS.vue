<template>
  <section class="demo">
    <h3>Basics, CSS transition, footer slot, nested dialogs</h3>
    <div class="row">
      <Button @click="cssOpen = true">Rename project</Button>
      <Button variant="outline" @click="outerOpen = true">Nested dialogs</Button>
    </div>

    <Dialog
      v-model:open="cssOpen"
      aria-label="CSS dialog"
      title="Rename project"
      description="The new name is visible to everyone in the workspace."
    >
      <template #default>
        <p>
          Body content goes here. The header above and footer below are the built-in chrome
          (title/description props plus the <code>#footer</code> slot).
        </p>
      </template>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <!-- Saved: a tick pops in and draws itself, the label eases to its new width, then it closes. -->
        <Button :loading="saving" @click="save(close)">
          <template v-if="saved" #leading>
            <svg v-animate="tickPop" class="save-tick" viewBox="0 0 16 16" aria-hidden="true">
              <path v-animate="tickDraw" d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength="1" />
            </svg>
          </template>
          <AnimatedText :value="saved ? 'Saved' : 'Save changes'" class="save-label" />
        </Button>
      </template>
    </Dialog>

    <Dialog v-model:open="outerOpen" aria-label="Outer dialog" title="Outer dialog">
      <template #default>
        <p>
          Escape here closes this dialog, unless the nested one below is open, in which case Escape
          closes that one first.
        </p>
        <Button variant="secondary" @click="innerOpen = true">Open nested dialog</Button>

        <Dialog v-model:open="innerOpen" aria-label="Inner dialog" title="Inner dialog" size="sm">
          <template #default>
            <p>Topmost: this is the one Escape and Tab act on right now.</p>
          </template>
        </Dialog>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { AnimatedText, Button, Dialog, vAnimate } from 'vael-ui'

const cssOpen = shallowRef(false)
const outerOpen = shallowRef(false)
const innerOpen = shallowRef(false)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const saving = shallowRef(false)
const saved = shallowRef(false)
watch(cssOpen, (open) => open && (saved.value = false))
async function save(close: () => void) {
  saving.value = true
  await wait(1200)
  saving.value = false
  saved.value = true
  // Long enough to see it land.
  await wait(700)
  close()
}
// The icon pops from small and soft, then its stroke draws, as a success check does.
const tickPop = {
  initial: { scale: 0.25, opacity: 0, blur: 4 },
  spring: { damping: 1, response: 0.3 },
}
const tickDraw = {
  initial: { strokeDashoffset: '1px' },
  duration: 350,
  easing: 'ease-out',
  delay: 0.08,
}
</script>

<style scoped>
.save-tick {
  inline-size: 1em;
  block-size: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.save-label {
  white-space: nowrap;
}
.save-tick path {
  stroke-dasharray: 1;
}
</style>
