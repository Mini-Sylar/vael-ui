<!-- Checkbox with every part: a checked box and its label. -->
<template>
  <div data-specimen class="specimen">
    <Checkbox v-model="checked" label="Email me when someone joins the team" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Checkbox } from 'vael-ui'

const checked = shallowRef(true)
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
</style>
