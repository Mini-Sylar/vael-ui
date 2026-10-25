<!-- DatePicker open with every part: a panel with the calendar, a time row and a footer. -->
<template>
  <div data-specimen class="specimen">
    <DatePicker
      v-model="date"
      v-model:open="open"
      show-time
      show-button-bar
      :close-on-outside="false"
      aria-label="Due date"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DatePicker } from 'vael-ui'

const date = ref(new Date(2026, 2, 12, 9, 30))
// Open from the start, and kept open while you point at its parts.
const open = ref(true)
</script>

<style scoped>
.specimen {
  inline-size: min(18rem, 100%);
  min-block-size: 26rem;
}
</style>
