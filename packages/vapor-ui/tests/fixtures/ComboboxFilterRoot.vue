<template>
  <Combobox
    v-model="value"
    :items="items"
    data-testid="vapor-built-combobox"
    placeholder="Station"
  />
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { Combobox } from 'vael-ui/vapor'

const value = ref<string | null>(null)
const items = ['Tema', 'Kasoa Toll Booth', 'Kasoa Amanfrom', 'Tabora', 'Haatso'].map((label) => ({
  label,
  value: label,
}))
</script>
