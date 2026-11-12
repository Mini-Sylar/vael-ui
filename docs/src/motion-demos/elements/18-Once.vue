<template>
  <section class="demo">
    <h3>Once per page load</h3>
    <Button variant="secondary" @click="shown = !shown"
      >{{ shown ? 'Hide' : 'Show' }} both lists</Button
    >
    <div v-if="shown" class="lists">
      <div>
        <p class="caption"><code>appear: 'once'</code></p>
        <ul>
          <li
            v-for="row in rows"
            :key="row"
            v-animate:once-demo="{
              initial: { opacity: 0, y: 6 },
              appear: 'once',
              stagger: 0.06,
              duration: 220,
            }"
          >
            {{ row }}
          </li>
        </ul>
      </div>
      <div>
        <p class="caption">Always</p>
        <ul>
          <li
            v-for="row in rows"
            :key="row"
            v-animate:always-demo="{
              initial: { opacity: 0, y: 6 },
              stagger: 0.06,
              duration: 220,
            }"
          >
            {{ row }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'

const shown = shallowRef(true)
const rows = ['Inbox', 'Starred', 'Sent', 'Drafts']
</script>

<style scoped>
.lists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 12rem));
  gap: 1.5rem;
  margin-block-start: 1rem;
}
.caption {
  margin: 0 0 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
ul {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: 0.875rem;
}
</style>
