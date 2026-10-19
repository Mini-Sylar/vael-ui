<template>
  <section class="demo">
    <h3>Year buttons</h3>
    <p class="note">
      <code>show-year-buttons</code> adds « and » to the panel's header, so a range starting a year
      back is two clicks: « then the day.
    </p>
    <div class="row">
      <DatePicker
        v-model="oneMonth"
        :locale="currentLocale"
        selection-mode="range"
        placeholder="Pick a date range"
        show-year-buttons
      />
      <DatePicker
        v-model="twoMonths"
        :locale="currentLocale"
        selection-mode="range"
        :months="2"
        placeholder="Two months"
        show-year-buttons
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)
const oneMonth = shallowRef<CalendarRange | null>(null)
const twoMonths = shallowRef<CalendarRange | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
