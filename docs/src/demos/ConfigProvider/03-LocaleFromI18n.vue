<template>
  <section class="demo">
    <h3>Dates and numbers follow your i18n locale</h3>
    <p class="note">
      Pass your <code>useI18n()</code> as <code>i18n</code>. Its current <code>locale</code> formats
      every calendar, date picker and number field inside, and they change with your language.
      Change the language at the top of this page to see it.
    </p>
    <ConfigProvider :i18n="i18n">
      <div class="row">
        <DatePicker v-model="date" aria-label="Date" />
        <InputNumber v-model="price" mode="currency" currency="EUR" aria-label="Price" />
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfigProvider, DatePicker, InputNumber } from 'vael-ui'

const i18n = useI18n()

const date = shallowRef<Date | null>(new Date(2026, 9, 16))
const price = shallowRef<number | null>(1234.5)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
