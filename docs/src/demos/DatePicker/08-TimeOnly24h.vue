<template>
  <section class="demo">
    <h3>Time only, forced 24h</h3>
    <p class="note">
      <code>timeOnly</code> hides the calendar entirely — just the hour/minute row.
      <code>hourFormat="24"</code> forces 24h even though the locale would otherwise default to 12h,
      and drops the AM/PM toggle since it isn't needed.
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
