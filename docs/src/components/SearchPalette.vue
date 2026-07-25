<template>
  <Combobox
    :model-value="null"
    :items="items"
    :placeholder="t('nav.search')"
    clearable
    class="search-palette"
    @update:model-value="onSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Combobox } from 'vael-ui'
import { allComponents } from '../taxonomy'

const { t } = useI18n()
const router = useRouter()

const items = computed(() => allComponents.map((name) => ({ label: name, value: name })))

function onSelect(value: string | number | (string | number)[] | null) {
  if (typeof value === 'string') router.push({ name: 'component', params: { name: value } })
}
</script>

<style scoped>
.search-palette {
  width: 14rem;
}
</style>
