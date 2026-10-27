<template>
  <section class="demo">
    <h3>Swap</h3>
    <Button @click="open = true">Set up workspace</Button>
    <Dialog
      v-model:open="open"
      size="sm"
      :title="steps[step].title"
      :motion="{ swap: 'wait', direction }"
    >
      <div
        :key="step"
        v-animate="{ initial: ({ direction }) => ({ opacity: 0, x: 24 * direction }) }"
      >
        {{ steps[step].text }}
      </div>
      <template #footer>
        <Button variant="secondary" :disabled="step === 0" @click="go(-1)">Back</Button>
        <Button v-if="step < steps.length - 1" @click="go(1)">Next</Button>
        <Button v-else @click="open = false">Finish</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const steps = [
  { title: 'Name it', text: 'Give the workspace a short name your team will recognise.' },
  { title: 'Invite people', text: 'Add teammates by email. You can skip this for now.' },
  { title: 'All set', text: 'Your workspace is ready. Start with a first project.' },
]

const open = shallowRef(false)
const step = shallowRef(0)
const direction = shallowRef<1 | -1>(1)

function go(by: 1 | -1) {
  direction.value = by
  step.value += by
}
</script>
