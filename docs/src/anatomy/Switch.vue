<!-- Switch with every part: a track, its thumb, and the label, switched on. -->
<template>
  <div data-specimen class="specimen">
    <Switch v-model="on" label="Two-factor authentication" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Switch } from 'vael-ui'

const on = shallowRef(true)
</script>

<style scoped>
.specimen {
  inline-size: min(18rem, 100%);
}
</style>
