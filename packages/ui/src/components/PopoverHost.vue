<template>
  <PopoverHostEntry v-for="entry in queue" :key="entry.id" :entry="entry" />
</template>

<script setup lang="ts">
import PopoverHostEntry from './PopoverHostEntry.vue'
import { usePopoverQueue } from '../composables/usePopoverService'

// Mount once per app: renders shared queue from openPopover().
const queue = usePopoverQueue()
</script>
