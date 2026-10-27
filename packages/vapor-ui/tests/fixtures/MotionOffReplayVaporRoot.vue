<template>
  <ConfigProvider :motion="on ? { version: 1, spring: 'smooth' } : false">
    <Badge
      :count="count"
      :motion="{
        replay: count,
        appear: false,
        initial: { root: { scale: 0.6, opacity: 0 } },
        spring: 'bouncy',
        onAfterEnter: entered,
      }"
    />
  </ConfigProvider>
</template>

<script setup lang="ts" vapor>
// A component's replay inside a provider whose motion is turned off at runtime.
import { shallowRef } from 'vue'
import { Badge, ConfigProvider } from 'vael-ui/vapor'

const on = shallowRef(true)
const count = shallowRef(0)
const afterEnter = shallowRef(0)
const entered = () => afterEnter.value++
defineExpose({ on, count, afterEnter })
</script>
