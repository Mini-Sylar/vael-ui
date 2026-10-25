<!-- Removable chips, as active filters: each has a label and a remove button. -->
<template>
  <div data-specimen class="specimen">
    <Chip label="Admins" removable />
    <Chip label="Team plan" removable />
    <Chip label="This week" removable />
  </div>
</template>

<script setup lang="ts">
import { Chip } from 'vael-ui'
</script>

<style scoped>
.specimen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  inline-size: min(22rem, 100%);
}
</style>
