<template>
  <span class="bar-tip">
    <strong>{{ name }}</strong>
    <span class="bar-tip-row"
      ><span class="bar-tip-dot" :style="{ background: color }" />{{ status }}</span
    >
    <span class="bar-tip-row is-muted">{{ dates }}</span>
    <span class="bar-tip-track"><span :style="{ inlineSize: `${percent}%` }" /></span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ name: string; status: string; color: string; dates: string; percent: number }>()
</script>

<style scoped>
.bar-tip {
  display: grid;
  gap: 0.25rem;
  min-inline-size: 10rem;
}
.bar-tip-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.bar-tip-row.is-muted {
  opacity: 0.75;
}
.bar-tip-dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
}
.bar-tip-track {
  display: block;
  block-size: 4px;
  margin-block-start: 0.25rem;
  border-radius: 999px;
  background: color-mix(in oklab, currentColor 20%, transparent);
  overflow: hidden;
}
.bar-tip-track > span {
  display: block;
  block-size: 100%;
  background: currentColor;
}
</style>
