<template>
  <section class="demo">
    <h3>Field-wrapped, required with validation</h3>
    <p class="note">Same "standalone-or-Field" contract as every other control here.</p>
    <Field
      label="Departure date"
      description="Required for one-way bookings"
      :required="true"
      :error="fieldError"
    >
      <DatePicker
        v-model="fieldValue"
        :locale="currentLocale"
        placeholder="Choose a departure date"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatePicker, Field } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const fieldValue = shallowRef<Date | null>(null)

const fieldError = computed(() => (fieldValue.value ? '' : 'Pick a departure date to continue'))
</script>
