<template>
  <section class="demo">
    <h3>Layout: position, size, and long content</h3>
    <div class="row">
      <Button variant="outline" @click="longContentOpen = true">Long content</Button>
      <Button variant="outline" @click="openPositioned('top')">Top dialog</Button>
      <Button variant="outline" @click="openPositioned('bottom')">Bottom dialog</Button>
      <Button variant="outline" @click="maximizableOpen = true">Maximizable dialog</Button>
      <Button variant="outline" @click="blurredOpen = true">Blurred backdrop</Button>
    </div>
    <p class="note">
      Long content triggers <code>scroll-fade</code> automatically once the panel actually
      overflows; the shorter dialogs above never get it. <code>position</code> and
      <code>maximizable</code> are just props. "Blurred backdrop" sets
      <code>:ui="{ overlay: 'blurred-overlay' }"</code>: the overlay is a separate DOM node from the
      panel, so this is the only way to reach it, since a plain <code>class</code> on
      <code>&lt;Dialog&gt;</code> would land on the panel instead.
    </p>

    <Dialog
      v-model:open="longContentOpen"
      aria-label="Long content dialog"
      title="Terms of service"
      size="lg"
    >
      <template #default>
        <p v-for="n in 10" :key="n">
          Section {{ n }}. This paragraph exists purely to overflow the panel's
          <code>max-block-size: 85dvh</code> so <code>scroll-fade</code> has something to mask.
          Scroll and watch the top/bottom edges fade content in and out instead of clipping it hard.
        </p>
      </template>
      <template #footer="{ close }">
        <Button @click="close()">I have read all of this</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:open="positionOpen"
      :position="demoPosition"
      aria-label="Positioned dialog"
      title="Positioned dialog"
      size="sm"
    >
      <template #default>
        <p>
          Anchored to <code>{{ demoPosition }}</code
          >: enter/exit slides from that edge instead of scaling from center.
        </p>
      </template>
    </Dialog>

    <Dialog
      v-model:open="maximizableOpen"
      maximizable
      aria-label="Maximizable dialog"
      title="Maximizable dialog"
    >
      <template #default>
        <p>
          Toggle the expand icon next to close. It fills the viewport, no drag or resize, just the
          one thing that was actually asked for.
        </p>
      </template>
    </Dialog>

    <Dialog
      v-model:open="blurredOpen"
      :ui="{ overlay: 'blurred-overlay' }"
      aria-label="Blurred backdrop dialog"
      title="Blurred backdrop"
      size="sm"
    >
      <template #default>
        <p>The page behind this dialog is blurred, not just dimmed.</p>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog } from 'vael-ui'
import type { DialogPosition } from 'vael-ui'

const longContentOpen = shallowRef(false)

const positionOpen = shallowRef(false)
const demoPosition = shallowRef<DialogPosition>('center')
function openPositioned(position: DialogPosition) {
  demoPosition.value = position
  positionOpen.value = true
}

const maximizableOpen = shallowRef(false)
const blurredOpen = shallowRef(false)
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>

<!-- Unscoped: the overlay teleports to <body> with Dialog, out of scoped reach. -->
<style>
.blurred-overlay {
  backdrop-filter: blur(8px);
}
</style>
