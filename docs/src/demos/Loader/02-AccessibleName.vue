<template>
  <section class="demo">
    <h3>Accessible name, <code>label</code> renders role="status" plus visually-hidden text</h3>
    <div class="row">
      <Loader label="Loading results" />
      <span class="panel-text"
        >↑ has an accessible name even though nothing is visibly labeled</span
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { Loader } from 'vael-ui'
</script>
