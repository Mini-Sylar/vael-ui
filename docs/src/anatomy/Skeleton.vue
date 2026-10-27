<!-- Skeletons standing in for a profile row: an avatar circle and two lines of text. -->
<template>
  <div data-specimen class="specimen">
    <Skeleton variant="circle" class="avatar" />
    <div class="lines">
      <Skeleton variant="text" class="name" />
      <Skeleton variant="text" class="email" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from 'vael-ui'
</script>

<style scoped>
.specimen {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  inline-size: min(20rem, 100%);
}

.avatar {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  flex: none;
}

.lines {
  display: grid;
  flex: 1;
  gap: 0.5rem;
}

.name {
  inline-size: 55%;
}

.email {
  inline-size: 85%;
}
</style>
