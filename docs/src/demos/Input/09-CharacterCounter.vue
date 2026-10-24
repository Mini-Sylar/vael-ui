<template>
  <section class="demo">
    <h3>Character counter</h3>
    <p class="note">
      Show the length of the <code>v-model</code> value in the <code>#end</code> slot.
      <code>maxlength</code> stops input at the limit, and <code>aria-describedby</code> links the
      count to the field for screen readers.
    </p>
    <Input
      v-model="title"
      class="title-input"
      :maxlength="LIMIT"
      aria-label="Post title"
      aria-describedby="title-count"
      placeholder="Post title"
    >
      <template #end>
        <span id="title-count" class="count" :class="{ 'count--near': left <= 10 }">
          {{ title.length }}/{{ LIMIT }}
        </span>
      </template>
    </Input>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Input } from 'vael-ui'

const LIMIT = 60
const title = shallowRef('Ten small habits that make code reviews faster')
const left = computed(() => LIMIT - title.value.length)
</script>

<style scoped>
.title-input {
  max-inline-size: 28rem;
}
.count {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
.count--near {
  color: var(--ui-warning);
}
</style>
