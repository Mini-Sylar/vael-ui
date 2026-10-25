<template>
  <ul v-hover-indicator="'.row'" data-testid="vapor-hover-list" style="width: 200px">
    <li v-for="item in items" :key="item" class="row" style="height: 32px">{{ item }}</li>
  </ul>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: a missed Vapor alias only fails at runtime.
import { vHoverIndicator } from 'vael-ui/vapor'

const items = ['One', 'Two', 'Three']
</script>
