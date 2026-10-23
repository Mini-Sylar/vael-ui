<template>
  <section class="demo">
    <h3>Two months side by side</h3>
    <p class="note">
      <code>:months="2"</code> shows two months side by side, so a range that crosses into the next
      month stays in view. The arrows move both months together, and on a narrow screen they stack.
    </p>
    <DatePicker
      v-model="rangeValue"
      :locale="currentLocale"
      selection-mode="range"
      :months="2"
      placeholder="Pick a date range"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const rangeValue = shallowRef<CalendarRange | null>(null)
</script>
