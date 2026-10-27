<template>
  <section
    v-if="selected"
    v-animate="{ layout: true, layoutId: `site-${selected!.id}` }"
    class="detail"
  >
    {{ selected.name }}
  </section>
</template>

<script setup lang="ts" vapor>
// v-animate's value reads an object the v-if guards; clearing it removes the element. `layout`
// starts its followers inside an effect, where nothing else would stop them.
import { shallowRef } from 'vue'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const selected = shallowRef<{ id: number; name: string } | null>(null)
defineExpose({ selected })
</script>
