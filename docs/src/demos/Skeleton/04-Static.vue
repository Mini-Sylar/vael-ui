<template>
  <section class="demo">
    <h3><code>animated=false</code>, static placeholder, no pulse</h3>
    <div class="row">
      <Skeleton variant="text" :animated="false" style="width: 12rem" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Skeleton } from 'vael-ui'
</script>
