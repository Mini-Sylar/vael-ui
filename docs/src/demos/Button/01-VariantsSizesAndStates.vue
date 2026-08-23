<template>
  <section class="demo">
    <h3>Variants, sizes, and states</h3>
    <div class="row">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="text">Text</Button>
      <Button variant="danger">Danger</Button>
    </div>
    <div class="row">
      <Button size="sm" variant="secondary">Small</Button>
      <Button size="md" variant="secondary">Medium</Button>
      <Button size="lg" variant="secondary">Large</Button>
    </div>
    <div class="row">
      <Button disabled>Primary</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="danger" disabled>Danger</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from 'vael-ui'
</script>
