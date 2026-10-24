<template>
  <section class="demo">
    <h3>Built by hand, same result</h3>
    <p class="note">
      The same trail, built from <code>BreadcrumbItem</code> and <code>BreadcrumbSeparator</code>.
      Use this when a crumb needs more than a label.
    </p>
    <Breadcrumb aria-label="Composed breadcrumb">
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
