<template>
  <section class="demo">
    <h3>Indeterminate, <code>value</code> unset</h3>
    <div class="row">
      <Progress :value="null" label="Working" style="max-width: 20rem" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Progress } from 'vael-ui'
</script>
