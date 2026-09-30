<template>
  <section class="demo">
    <h3>Variants</h3>
    <div class="row">
      <Badge variant="primary" :count="4" />
      <Badge variant="muted" :count="4" />
      <Badge variant="success" :count="4" />
      <Badge variant="warning" :count="4" />
      <Badge variant="danger" :count="4" />
      <Badge variant="info" :count="4" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Badge } from 'vael-ui'
</script>
