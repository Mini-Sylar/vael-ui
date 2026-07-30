<template>
  <Combobox
    :model-value="null"
    v-model:query="query"
    :items="items"
    clearable
    :placeholder="t('nav.search')"
    @update:model-value="onSelect"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Combobox } from 'vael-ui'
import { allComponents } from '../taxonomy'

const { t } = useI18n()
const router = useRouter()

const items = computed(() => allComponents.map((name) => ({ label: name, value: name })))
const query = shallowRef('')

function onSelect(value: string | number | (string | number)[] | null) {
  if (typeof value === 'string') {
    router.push({ name: 'component', params: { name: value } })
    query.value = ''
  }
}
</script>
