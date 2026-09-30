<template>
  <section class="demo">
    <h3>Capping large counts with <code>max</code></h3>
    <div class="row">
      <Badge :count="42" />
      <Badge :count="99" />
      <Badge :count="100" />
      <Badge :count="1500" />
      <Badge :count="12" :max="9" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Badge } from 'vael-ui'
</script>
