<template>
  <section class="demo">
    <h3>Composed, same result</h3>
    <p class="note">
      The same trail, built by hand from <code>BreadcrumbItem</code>/<code
        >BreadcrumbSeparator</code
      >
      instead — reach for this when a crumb needs custom content, not just a label.
    </p>
    <Breadcrumb>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem href="/docs">Docs</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>
  </section>
</template>

<script setup lang="ts">
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from 'vael-ui'
</script>
