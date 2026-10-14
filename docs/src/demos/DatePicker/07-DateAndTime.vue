<template>
  <section class="demo">
    <h3>Date + time, 12h with AM/PM</h3>
    <p class="note">
      <code>showTime</code> adds an hour/minute row — picking a date keeps the panel open since
      there's still a time to set. <code>hourFormat</code> is left unset here, so it resolves from
      the locale (<code>en-US</code> defaults to 12h with an AM/PM toggle).
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
