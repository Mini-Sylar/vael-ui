<template>
  <section class="demo">
    <h3>Spring indicator with vael-ui's spring</h3>
    <p class="note">
      The motion-v example above needs a <code>motion.span</code> per tab. With vael-ui's own spring
      it's one prop: <code>ConfigProvider</code>'s <code>indicator</code> takes
      <code>{ damping, response }</code>, and every sliding indicator inside springs, the hover
      highlight included. The spring writes to the element each frame, so nothing re-renders.
    </p>
    <ConfigProvider :indicator="{ damping: 0.6, response: 0.35 }">
      <Tabs v-model:active="active" :items="items">
        <template #default="{ items: list, itemProps, indicatorProps }">
          <span v-bind="indicatorProps('background')" />
          <button v-for="item in list" :key="item" v-bind="itemProps(item)">
            {{ item[0]!.toUpperCase() + item.slice(1) }}
          </button>
        </template>
      </Tabs>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { ConfigProvider, Tabs } from 'vael-ui'

const items = ['overview', 'analytics', 'settings']
const active = shallowRef('overview')
</script>
