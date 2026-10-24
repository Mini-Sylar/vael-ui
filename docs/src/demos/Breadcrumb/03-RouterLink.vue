<template>
  <section class="demo">
    <h3><code>RouterLink</code> for client-side navigation</h3>
    <p class="note">
      <code>as</code> takes any registered component by name. Vue Router registers
      <code>RouterLink</code> globally, so the name is enough, with no import.
    </p>
    <Breadcrumb aria-label="Router breadcrumb">
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
