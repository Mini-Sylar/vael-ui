<template>
  <component :is="loaded" v-if="loaded" :value="shown" :motion="motion" />
  <span v-else class="ui-animated-text" :data-motion="motion === false ? 'off' : undefined"
    ><span class="ui-animated-text-value">{{ shown }}</span></span
  >
</template>

<script lang="ts">
import { markRaw } from 'vue'
import type { Component } from 'vue'

// One request for the whole page, however many fields use it; once it's in, later mounts use it at
// once, so text that mounts and changes in the same moment (a Combobox pick) still crossfades.
let request: Promise<Component> | undefined
let ready: Component | undefined
const load = () =>
  (request ??= import('../AnimatedText/AnimatedText.vue').then(
    (mod) => (ready = markRaw(mod.default)),
  ))
</script>

<!-- AnimatedText, split out of the bundle: plain text with the same markup until the value first
     changes, so a field that never changes never mounts it. -->
<script setup lang="ts">
import '../AnimatedText/AnimatedText.css'
import { onMounted, onUpdated, shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

// Unset, not false: AnimatedText then follows the nearest ConfigProvider.
const props = withDefaults(defineProps<{ value: string; motion?: boolean }>(), {
  motion: undefined,
})

const shown = shallowRef(props.value)
const loaded: ShallowRef<Component | null> = shallowRef(null)
// Fetched once for the page, so a later change can crossfade.
onMounted(() => props.motion !== false && void load())
// A first change with the code here mounts it on the old text; the update hands it the new one.
watch(
  () => props.value,
  (next) => {
    if (!loaded.value && ready && props.motion !== false) loaded.value = ready
    else shown.value = next
  },
)
onUpdated(() => (shown.value = props.value))
</script>
