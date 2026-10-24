<template>
  <component :is="loaded" v-if="loaded" :value="value" :locale="locale" :format="format" />
  <span v-else class="ui-animated-number">{{ text }}</span>
</template>

<script lang="ts">
import { markRaw } from 'vue'
import type { Component } from 'vue'

// One request for the whole page, however many fields use it.
let request: Promise<Component> | undefined
const load = () =>
  (request ??= import('../AnimatedNumber/AnimatedNumber.vue').then((mod) => markRaw(mod.default)))
</script>

<!-- AnimatedNumber, split out of the bundle: the formatted text until it loads after mount. -->
<script setup lang="ts">
import '../AnimatedNumber/AnimatedNumber.css'
import { computed, onMounted, shallowRef } from 'vue'
import { validLocale } from '../../config'

const props = defineProps<{ value: number; locale?: string; format?: Intl.NumberFormatOptions }>()

const text = computed(() =>
  new Intl.NumberFormat(validLocale(props.locale), props.format).format(props.value),
)
const loaded = shallowRef<Component | null>(null)
onMounted(() => void load().then((component) => (loaded.value = component)))
</script>
