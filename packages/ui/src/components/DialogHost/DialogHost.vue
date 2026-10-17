<template>
  <DialogHostEntry v-for="entry in shown" :key="entry.id" :entry="entry" />
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import DialogHostEntry from './DialogHostEntry.vue'
import { useDialogQueue } from '../../composables/useDialogService'

// Mount once per app: renders shared queue from openDialog().
const queue = useDialogQueue()
// Empty until mounted, like the server render, so one opened during hydration can't make
// the browser's first render differ from the server's.
const mounted = shallowRef(false)
onMounted(() => (mounted.value = true))
const shown = computed(() => (mounted.value ? queue : []))
</script>
