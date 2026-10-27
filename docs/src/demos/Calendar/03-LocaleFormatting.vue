<template>
  <section class="demo">
    <h3>Locale formatting</h3>
    <p class="note">
      <code>locale</code> sets the month and weekday names and the first day of the week through
      <code>Intl.DateTimeFormat</code>, so there are no i18n data files to ship.
      <code>fr-FR</code> starts the week on Monday. Compare it with the calendars above, which
      follow this site’s language.
    </p>
    <div class="row">
      <Calendar v-model="localeValue" locale="fr-FR" />
      <output class="panel-text">
        {{ localeValue ? frFormatter.format(localeValue) : 'Aucune date choisie' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Calendar } from 'vael-ui'

const localeValue = shallowRef<Date | null>(null)

const frFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' })
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
