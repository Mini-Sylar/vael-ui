<!-- OtpInput with every part: six cells in two groups, the separator, and the input over them. -->
<template>
  <div data-specimen class="specimen">
    <OtpInput v-model="code" :groups="3" aria-label="Verification code" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { OtpInput } from 'vael-ui'

// Partly typed: filled cells and empty ones.
const code = shallowRef('4821')
</script>

<style scoped>
.specimen {
  display: grid;
  justify-items: center;
  inline-size: min(20rem, 100%);
}
</style>
