<template>
  <section class="demo">
    <h3>Standalone, no Field ancestor</h3>
    <p class="note">
      Each control works the same with no Field around it. A Field only adds wiring, such as the
      label and the error, so it’s never required.
    </p>
    <Input placeholder="No Field above me" />
  </section>
</template>

<script setup lang="ts">
import { Input } from 'vael-ui'
</script>
