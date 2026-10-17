<template>
  <section class="demo">
    <h3>Custom separator</h3>
    <Breadcrumb aria-label="Breadcrumb with custom separator">
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem href="/docs">Docs</BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>
  </section>
</template>

<script setup lang="ts">
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from 'vael-ui'
</script>
