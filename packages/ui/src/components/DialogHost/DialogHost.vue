<template>
  <DialogHostEntry v-for="entry in queue" :key="entry.id" :entry="entry" />
</template>

<script setup lang="ts">
import DialogHostEntry from './DialogHostEntry.vue'
import { useDialogQueue } from '../../composables/useDialogService'

// Mount once per app: renders shared queue from openDialog().
const queue = useDialogQueue()
</script>
