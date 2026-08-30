<template>
  <section class="demo">
    <h3><code>RouterLink</code>, real client-side navigation</h3>
    <p class="note">
      <code>as</code> takes any registered component by name — Vue Router auto-registers
      <code>RouterLink</code> globally, so the string name alone is enough, no import required.
    </p>
    <Breadcrumb>
      <BreadcrumbItem as="RouterLink" to="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem as="RouterLink" to="/components">Components</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>
  </section>
</template>

<script setup lang="ts">
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from 'vael-ui'
</script>
