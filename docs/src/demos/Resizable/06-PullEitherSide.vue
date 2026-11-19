<template>
  <section class="demo">
    <h3>Pull from either side</h3>
    <p class="note">
      <code>edge="both"</code> puts a handle on each side. Pulling one moves only that side: the far
      side stays where it is, and it stops at the edge of its container. With <code>centered</code>,
      the handle you pull follows the pointer and the opposite side moves the same distance the
      other way, so the middle stays put.
    </p>
    <Switch v-model="centered" label="Centered" />
    <div class="stage">
      <Resizable
        v-model:size="width"
        edge="both"
        :centered="centered"
        :min="120"
        :max="420"
        class="panel"
      >
        <p>{{ Math.round(width) }} px</p>
      </Resizable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Resizable, Switch } from 'vael-ui'

const width = shallowRef(220)
const centered = shallowRef(false)
</script>

<style scoped>
.stage {
  display: flex;
  justify-content: center;
  padding: 1rem;
  border: 1px dashed var(--ui-border);
  border-radius: var(--ui-radius);
}
.panel {
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.panel p {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
</style>
