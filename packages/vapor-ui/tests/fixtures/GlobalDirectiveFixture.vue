<template>
  <button data-testid="global-directive-target" v-tooltip="'hi'">Hover</button>
</template>

<script setup lang="ts" vapor>
// No local vTooltip import — must resolve via app.directive() alone.
</script>
