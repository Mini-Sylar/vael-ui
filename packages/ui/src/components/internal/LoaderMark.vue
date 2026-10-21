<template>
  <span v-if="builtIn" :class="['ui-loader', `ui-loader--${builtIn}`]" aria-hidden="true">
    <span v-for="n in LOADER_PARTS[builtIn]" :key="n" class="ui-loader-part" />
  </span>
  <span v-else class="ui-loader ui-loader--custom" aria-hidden="true">
    <component :is="type" />
  </span>
</template>

<!--
  Internal, not exported from index.ts: the spinner Button, Select lists, toasts and
  PullToRefresh draw, so every one of them follows ConfigProvider's `loaderType`.
-->
<script setup lang="ts">
import '../shared/loader-spinner.css'
import { computed } from 'vue'
import { LOADER_PARTS, useLoaderType } from '../../composables/loaderType'
import type { LoaderSource } from '../../composables/loaderType'

const props = defineProps<{ type?: LoaderSource }>()
const type = useLoaderType(() => props.type)
const builtIn = computed(() => (typeof type.value === 'string' ? type.value : null))
</script>
