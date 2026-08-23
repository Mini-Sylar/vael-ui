<template>
  <section class="demo">
    <h3>Variants</h3>
    <div class="row">
      <Skeleton variant="text" style="width: 12rem" />
      <Skeleton variant="circle" />
      <Skeleton variant="rect" style="width: 6rem; height: 4rem" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Skeleton } from 'vael-ui'
</script>
