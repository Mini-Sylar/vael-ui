<template>
  <section class="demo">
    <h3>Date and time, 12-hour with AM/PM</h3>
    <p class="note">
      <code>showTime</code> adds an hour and minute row, and picking a date keeps the panel open so
      you can set the time. <code>hourFormat</code> is unset here, so the locale decides:
      <code>en-US</code>, for example, uses 12-hour time with an AM/PM toggle.
    </p>
    <div class="row">
      <DatePicker
        v-model="value"
        :locale="currentLocale"
        show-time
        show-button-bar
        placeholder="Pick a date and time"
      />
      <output class="panel-text">
        {{ value ? value.toLocaleString(currentLocale) : 'Nothing selected yet' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const value = shallowRef<Date | null>(null)
</script>
