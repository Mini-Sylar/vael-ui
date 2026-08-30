<template>
  <section class="demo">
    <h3>Sliding indicator (built in via <code>itemProps</code>/<code>indicatorProps</code>)</h3>
    <p class="note">
      The <code>#default</code> slot hands back <code>itemProps(item)</code> — the full
      <code>role</code>/<code>aria-selected</code>/roving-<code>tabindex</code>/click wiring, spread
      with <code>v-bind</code> onto whatever element you render — and
      <code>indicatorProps(variant)</code> for the optional sliding highlight, measured internally
      via <code>useTabIndicator()</code>. Two variants shown here, <code>'background'</code> (the
      default) and <code>'underline'</code>; both are plain classes if you'd rather style your own.
    </p>
    <div class="row">
      <Tabs v-model:active="bgActive" :items="items">
        <template #default="{ items: list, itemProps, indicatorProps }">
          <div v-bind="indicatorProps()" />
          <button v-for="item in list" :key="item" v-bind="itemProps(item)">
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>

      <Tabs v-model:active="underlineActive" :items="items">
        <template #default="{ items: list, itemProps, indicatorProps }">
          <div v-bind="indicatorProps('underline')" />
          <button v-for="item in list" :key="item" v-bind="itemProps(item)">
            <span class="tab-label">{{ item }}</span>
          </button>
        </template>
      </Tabs>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Tabs } from 'vael-ui'

type Section = 'overview' | 'analytics' | 'settings'
const items: Section[] = ['overview', 'analytics', 'settings']

const bgActive = shallowRef<Section>('overview')
const underlineActive = shallowRef<Section>('overview')
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.tab-label {
  display: inline-block;
}
</style>
