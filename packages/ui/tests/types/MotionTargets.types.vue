<!-- Type test, checked by `pnpm typecheck`: target names come from `motion.targets`, typos are errors. -->
<template>
  <Dialog
    :open="true"
    :motion="{
      targets: {
        summary: { initial: { opacity: 0 } },
        rows: { initial: { opacity: 0, y: 6 }, after: 'summary' },
      },
    }"
  >
    <template #default="{ target }">
      <p :ref="target('summary')">summary</p>
      <li :ref="target('rows')">row</li>
      <!-- @vue-expect-error a name that isn't in motion.targets -->
      <li :ref="target('rowz')">typo</li>
    </template>
  </Dialog>

  <Dialog
    :open="true"
    :motion="{
      targets: {
        summary: { initial: { opacity: 0 } },
        // @ts-expect-error `after` names a target that doesn't exist
        rows: { after: 'sumary' },
      },
    }"
  />

  <Popover :motion="{ targets: { line: { initial: { opacity: 0 } } } }">
    <template #default="{ target }">
      <p :ref="target('line')">line</p>
      <!-- @vue-expect-error a name that isn't in motion.targets -->
      <p :ref="target('lin')">typo</p>
    </template>
  </Popover>

  <!-- Without targets, any name is allowed (they may come from a style or v-animate). -->
  <Dialog :open="true">
    <template #default="{ target }">
      <p :ref="target('anything')">free</p>
    </template>
  </Dialog>

  <!-- Your own component: the names it gives useMotion autocomplete in its slot. -->
  <UseMotionSheet :open="true">
    <template #default="{ target }">
      <h2 :ref="target('title')">title</h2>
      <!-- @vue-expect-error a name UseMotionSheet doesn't have -->
      <p :ref="target('line')">typo</p>
    </template>
  </UseMotionSheet>
</template>

<script setup lang="ts">
import Dialog from '../../src/components/Dialog/Dialog.vue'
import Popover from '../../src/components/Popover/Popover.vue'
import UseMotionSheet from './UseMotionSheet.vue'
</script>
