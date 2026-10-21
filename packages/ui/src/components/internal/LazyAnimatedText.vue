<template>
  <component :is="loaded" v-if="loaded" :value="value" :motion="motion" />
  <span v-else class="ui-animated-text"
    ><span class="ui-animated-text-value">{{ value }}</span></span
  >
</template>

<script lang="ts">
import { markRaw } from 'vue'
import type { Component } from 'vue'

// One request for the whole page, however many fields use it.
let request: Promise<Component> | undefined
const load = () =>
  (request ??= import('../AnimatedText/AnimatedText.vue').then((mod) => markRaw(mod.default)))
</script>

<!-- AnimatedText, split out of the bundle: the same markup as plain text until it loads after mount. -->
<script setup lang="ts">
import '../AnimatedText/AnimatedText.css'
import { onMounted, shallowRef } from 'vue'

// Unset, not false: AnimatedText then follows the nearest ConfigProvider.
withDefaults(defineProps<{ value: string; motion?: boolean }>(), { motion: undefined })

const loaded = shallowRef<Component | null>(null)
onMounted(() => void load().then((component) => (loaded.value = component)))
</script>
