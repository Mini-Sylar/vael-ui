<template>
  <section class="demo">
    <h3>Range selection</h3>
    <p class="note">
      The trigger shows both ends once the range is complete. The panel stays open after the first
      click, because there’s a second date to pick.
    </p>
    <DatePicker
      style="max-inline-size: 20rem"
      v-model="rangeValue"
      :locale="currentLocale"
      selection-mode="range"
      placeholder="Pick a date range"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { shallowRef } from 'vue'
import { DatePicker } from 'vael-ui'
import type { CalendarRange } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const rangeValue = shallowRef<CalendarRange | null>(null)
</script>
