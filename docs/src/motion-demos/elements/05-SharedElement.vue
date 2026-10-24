<template>
  <section class="demo">
    <h3>Shared element</h3>
    <div class="stage">
      <div class="grid" :inert="!!selected">
        <!-- The others dim while one is open; the open one's place stays empty. -->
        <div
          v-for="card in cards"
          :key="card.name"
          v-animate="{
            animate: { opacity: selected && selected !== card ? 0.25 : 1 },
            duration: 200,
          }"
          class="cell"
          :class="{ 'cell--top': card === last }"
        >
          <button
            v-if="selected !== card"
            v-animate="{ layoutId: card.name }"
            class="card"
            :style="{ background: card.color }"
            @click="open(card)"
          >
            {{ card.name }}
          </button>
        </div>
      </div>
      <div
        v-if="selected"
        v-animate="{ layoutId: selected.name }"
        class="detail"
        :style="{ background: selected.color }"
      >
        <!-- In once it has landed, so nothing in it stretches on the way. -->
        <div
          v-animate="{ initial: { opacity: 0, y: 4 }, delay: 0.15, duration: 200 }"
          class="detail-body"
        >
          <div>
            <strong>{{ selected.name }}</strong>
            <p>{{ selected.note }}</p>
          </div>
          <Button size="sm" variant="secondary" @click="selected = null">Close</Button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, vAnimate } from 'vael-ui'

interface Card {
  name: string
  color: string
  note: string
}

const cards: Card[] = [
  { name: 'Coral', color: '#f4a393', note: 'Warm and loud: for the one thing on the page.' },
  { name: 'Sage', color: '#a8c5a0', note: 'Quiet green: a calm surface behind busy content.' },
  { name: 'Sky', color: '#9cc3e6', note: 'Soft blue: links and selections that stay friendly.' },
  { name: 'Amber', color: '#f0c674', note: 'Sunny yellow: warnings that do not shout.' },
  { name: 'Lilac', color: '#c3aee6', note: 'Light violet: for something new or in preview.' },
  { name: 'Mint', color: '#9fdcc8', note: 'Fresh green: success, without the alarm bells.' },
]
const selected = shallowRef<Card | null>(null)
// The one opened last stays on top of the others while it travels back.
const last = shallowRef<Card | null>(null)
function open(card: Card) {
  selected.value = last.value = card
}
</script>

<style scoped>
.stage {
  position: relative;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.cell {
  position: relative;
  block-size: 4.5rem;
}
.cell--top {
  z-index: 1;
}
.card {
  inline-size: 100%;
  block-size: 100%;
  border: 0;
  border-radius: var(--ui-radius);
  color: #1f2937;
  font: inherit;
  cursor: pointer;
}
.detail {
  position: absolute;
  inset: 0;
  padding: 1rem;
  border-radius: var(--ui-radius);
  color: #1f2937;
}
.detail-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  block-size: 100%;
}
.detail strong {
  font-size: 1.25rem;
}
.detail p {
  margin: 0.25rem 0 0;
}
</style>
