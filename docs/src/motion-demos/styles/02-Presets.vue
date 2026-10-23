<template>
  <section class="demo">
    <Button variant="outline" @click="run++">Replay</Button>
    <ConfigProvider :motion="style">
      <div :key="run" class="cards">
        <article v-animate="'rise'" class="card">
          <strong>Q3 plan</strong>
          <span>Rises in</span>
        </article>
        <article v-animate="'pop'" class="card">
          <strong>Launch</strong>
          <span>Pops in</span>
        </article>
        <article v-animate="'rise'" class="card">
          <strong>Retro</strong>
          <span>Rises in</span>
        </article>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, ConfigProvider, vAnimate } from 'vael-ui'
import type { MotionStyle } from 'vael-ui'

const style: MotionStyle = {
  version: 1,
  presets: {
    rise: { initial: { opacity: 0, y: 16 } },
    pop: {
      initial: { opacity: 0, scale: '0.9' },
      spring: { damping: 0.6, response: 0.4 },
    },
  },
}
const run = ref(0)
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.card span {
  color: var(--ui-text-muted);
}
</style>
