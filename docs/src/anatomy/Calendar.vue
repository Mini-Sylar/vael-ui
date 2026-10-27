<!-- Calendar with every part: the header with its nav buttons and label, the weekdays and the day grid, a date selected. -->
<template>
  <div data-specimen class="specimen">
    <Calendar v-model="date" locale="en-US" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Calendar } from 'vael-ui'

const date = shallowRef<Date | null>(new Date(2026, 9, 14))
</script>
