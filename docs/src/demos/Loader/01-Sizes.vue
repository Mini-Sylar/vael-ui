<template>
  <section class="demo">
    <h3>Sizes, <code>size</code> sets font-size, the ring is 1em</h3>
    <div class="row">
      <Loader size="0.875rem" />
      <Loader size="1.25rem" />
      <Loader size="2rem" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Loader } from 'vael-ui'
</script>
