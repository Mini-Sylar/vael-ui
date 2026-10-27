<template>
  <component
    :is="loaded"
    v-if="loaded"
    :value="value"
    :locale="locale"
    :format="format"
    :motion="rollMotion"
  />
  <span v-else class="ui-animated-number">{{ text }}</span>
</template>

<script lang="ts">
import { markRaw } from 'vue'
import type { Component } from 'vue'

// One request for the whole page, however many fields use it; once it's in, later mounts use it at
// once, so a number that mounts and changes in the same moment still rolls.
let request: Promise<Component> | undefined
let ready: Component | undefined
const load = () =>
  (request ??= import('../AnimatedNumber/AnimatedNumber.vue').then(
    (mod) => (ready = markRaw(mod.default)),
  ))
</script>

<!-- AnimatedNumber, split out of the bundle: the formatted text until it loads after mount. -->
<script setup lang="ts">
import '../AnimatedNumber/AnimatedNumber.css'
import { computed, onMounted, shallowRef } from 'vue'
import { validLocale } from '../../config'

const props = defineProps<{
  value: number
  locale?: string
  format?: Intl.NumberFormatOptions
  /** Arriving from empty: the reels roll up from 0. */
  rollIn?: boolean
}>()

const text = computed(() =>
  new Intl.NumberFormat(validLocale(props.locale), props.format).format(props.value),
)
// Unset otherwise, so AnimatedNumber follows the nearest ConfigProvider.
const rollMotion = computed(() => (props.rollIn ? { when: 'visible' as const } : undefined))
const loaded = shallowRef<Component | null>(ready ?? null)
onMounted(() => void load().then((component) => (loaded.value = component)))
</script>
