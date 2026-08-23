<template>
  <section class="demo">
    <h3>Standalone, no Field ancestor</h3>
    <p class="note">
      Every control injects the field context with a safe default and works identically with no
      Field wrapping it, the wiring is additive, never required.
    </p>
    <Input placeholder="No Field above me" />
  </section>
</template>

<script setup lang="ts">
import { Input } from 'vael-ui'
</script>
