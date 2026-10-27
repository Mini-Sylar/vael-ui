<template>
  <section class="demo">
    <h3>Sliding indicator with <code>itemProps</code> and <code>indicatorProps</code></h3>
    <p class="note">
      The <code>#default</code> slot receives <code>itemProps(item)</code>, which holds the
      <code>role</code>, <code>aria-selected</code>, roving <code>tabindex</code> and click
      handling; bind it with <code>v-bind</code> to any element you render.
      <code>indicatorProps(variant)</code> adds the optional sliding indicator, which
      <code>useTabIndicator()</code> measures. This shows both variants,
      <code>'background'</code> (the default) and <code>'underline'</code>; they're plain classes
      you can restyle.
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
