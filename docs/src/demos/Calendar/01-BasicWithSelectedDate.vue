<template>
  <section class="demo">
    <h3>Basic, with the selected date shown</h3>
    <div class="row">
      <Calendar v-model="basicValue" :locale="currentLocale" />
      <output class="panel-text">
        {{ basicValue ? basicValue.toDateString() : 'Nothing selected yet' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Calendar } from 'vael-ui'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value)

const basicValue = shallowRef<Date | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
