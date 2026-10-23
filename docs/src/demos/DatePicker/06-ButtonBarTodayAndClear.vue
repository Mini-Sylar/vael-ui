<template>
  <section class="demo">
    <h3>Today and Clear buttons</h3>
    <p class="note">
      <code>showButtonBar</code> adds a footer with Today and Clear. Today sets the value and also
      moves the calendar to today’s month.
    </p>
    <div class="row">
      <DatePicker
        v-model="value"
        :locale="currentLocale"
        show-button-bar
        placeholder="Pick a date"
      />
      <output class="panel-text">
        {{ value ? value.toDateString() : 'Nothing selected yet' }}
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
