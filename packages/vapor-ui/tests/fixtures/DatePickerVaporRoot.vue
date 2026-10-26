<template>
  <DatePicker v-model="date" aria-label="Visit date" />
</template>

<script setup lang="ts" vapor>
// The calendar loads apart from the field, so the panel is an async component.
import { shallowRef } from 'vue'
import { DatePicker } from 'vael-ui/vapor'

const date = shallowRef<Date | null>(new Date(2026, 9, 14))
</script>
