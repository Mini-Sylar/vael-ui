<template>
  <div class="v-animate-demo">
    <div class="actions">
      <Button size="sm" @click="add">Add</Button>
      <Button size="sm" variant="secondary" @click="shuffle">Shuffle</Button>
    </div>
    <ul class="list">
      <li
        v-for="item in items"
        :key="item"
        v-animate:rows.rise.stagger="{ layout: true }"
        class="row"
      >
        <span>Item {{ item }}</span>
        <Button size="sm" variant="ghost" :aria-label="`Remove item ${item}`" @click="remove(item)">
          Remove
        </Button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

let next = 4
const items = shallowRef([1, 2, 3])

function add() {
  items.value = [...items.value, next++]
}
function remove(item: number) {
  items.value = items.value.filter((each) => each !== item)
}
function shuffle() {
  items.value = [...items.value].sort(() => Math.random() - 0.5)
}
</script>

<style scoped>
.v-animate-demo {
  display: grid;
  gap: 0.75rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.list {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: 0.875rem;
}
</style>
