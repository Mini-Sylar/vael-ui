<template>
  <DemoExampleBlock v-if="example" name="motion" :example="example" :show-title="!!title" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watchEffect } from 'vue'
import type { Component } from 'vue'
import DemoExampleBlock from './DemoExampleBlock.vue'
import type { DemoExample } from './DemoFrame.vue'

// A live example on a Motion page, with its code: `id` is its path under motion-demos, no `.vue`.
const props = defineProps<{ id: string; title?: string }>()

const modules = import.meta.glob<{ default: Component }>('../motion-demos/**/*.vue')
const sources = import.meta.glob<string>('../motion-demos/**/*.vue', {
  query: '?raw',
  import: 'default',
})

// The demo's own heading and maintainer notes stay out of the code you copy.
const strip = (source: string) =>
  source
    .replace(/[ \t]*<p class="note">[\s\S]*?<\/p>\n?/g, '')
    .replace(/[ \t]*<h[23]>[\s\S]*?<\/h[23]>\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')

const example = shallowRef<DemoExample>()
watchEffect(async () => {
  const path = `../motion-demos/${props.id}.vue`
  const load = modules[path]
  const source = sources[path]
  if (!load || !source) return
  example.value = {
    id: `motion/${props.id}`,
    title: props.title ?? '',
    vdomComponent: defineAsyncComponent(load),
    vaporComponent: null,
    vdomCode: strip(await source()),
    vaporCode: '',
  }
})
</script>
