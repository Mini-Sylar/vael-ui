<template>
  <section class="demo">
    <h3>After a swap</h3>
    <Button @click="open = true">Create workspace</Button>
    <Dialog v-model:open="open" size="sm" :title="steps[step]!.title" :motion="motion">
      <div
        :key="step"
        v-animate="{ initial: ({ direction }) => ({ opacity: 0, x: 24 * direction }) }"
      >
        <Input v-model="answers[step]" :aria-label="steps[step]!.title" />
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
import { computed, reactive, shallowRef } from 'vue'
import { Button, Dialog, Input } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { DialogMotion } from 'vael-ui'

const steps = [{ title: 'Name it' }, { title: 'Your role' }, { title: 'Team size' }]
const answers = reactive<string[]>(['', '', ''])
const open = shallowRef(false)
const step = shallowRef(0)
const direction = shallowRef<1 | -1>(1)

const motion = computed<DialogMotion>(() => ({
  swap: 'wait',
  direction: direction.value,
  // The next step is in: its field takes focus.
  onAfterSwap: (view) => view.querySelector('input')?.focus(),
}))

function go(by: 1 | -1) {
  direction.value = by
  step.value += by
}
</script>
