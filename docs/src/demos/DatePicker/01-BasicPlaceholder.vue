<template>
  <section class="demo">
    <h3>Basic, with a placeholder</h3>
    <div class="row">
      <DatePicker v-model="basicValue" :locale="currentLocale" placeholder="Pick a date" />
      <output class="panel-text">
        {{ basicValue ? basicValue.toDateString() : 'Nothing selected yet' }}
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

const basicValue = shallowRef<Date | null>(null)
</script>
