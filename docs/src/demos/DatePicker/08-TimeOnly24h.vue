<template>
  <section class="demo">
    <h3>Time only, 24-hour</h3>
    <p class="note">
      <code>timeOnly</code> shows only the hour and minute row, without the calendar.
      <code>hourFormat="24"</code> uses 24-hour time even where the locale defaults to 12-hour, and
      drops the AM/PM toggle.
    </p>
    <div class="row">
      <DatePicker
        v-model="value"
        time-only
        hour-format="24"
        :minute-step="5"
        placeholder="Set a time"
      />
      <output class="panel-text">
        {{ value ? value.toTimeString().slice(0, 5) : 'Nothing selected yet' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { DatePicker } from 'vael-ui'

const value = shallowRef<Date | null>(null)
</script>
