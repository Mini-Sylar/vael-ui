<template>
  <span :class="['ui-loader', `ui-loader--${type}`]" aria-hidden="true">
    <span v-for="n in LOADER_PARTS[type]" :key="n" class="ui-loader-part" />
  </span>
</template>

<!--
  Internal, not exported from index.ts: the spinner Button, Select lists, toasts and
  PullToRefresh draw, so every one of them follows ConfigProvider's `loaderType`.
-->
<script setup lang="ts">
import '../shared/loader-spinner.css'
import { LOADER_PARTS, useLoaderType } from '../../composables/loaderType'
import type { LoaderType } from '../../composables/loaderType'

const props = defineProps<{ type?: LoaderType }>()
const type = useLoaderType(() => props.type)
</script>
