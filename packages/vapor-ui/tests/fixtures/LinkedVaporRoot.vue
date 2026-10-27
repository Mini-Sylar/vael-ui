<template>
  <div class="page">Page</div>
  <Drawer v-model:open="drawer" title="Drawer" :motion="{ linked: recede }"><p>Body</p></Drawer>
  <BottomSheet v-model:open="sheet" aria-label="Sheet" :motion="{ linked: recede }">
    <p>Body</p>
  </BottomSheet>
</template>

<script setup lang="ts" vapor>
// The built Vapor Drawer and BottomSheet with a linked page.
import { shallowRef } from 'vue'
import { BottomSheet, Drawer } from 'vael-ui/vapor'

const drawer = shallowRef(false)
const sheet = shallowRef(false)
const recede = {
  page: { el: () => document.querySelector('.page'), open: { scale: '0.9', borderRadius: '8px' } },
}
defineExpose({ drawer, sheet })
</script>
