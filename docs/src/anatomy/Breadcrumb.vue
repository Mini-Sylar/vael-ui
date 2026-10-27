<!-- Breadcrumb with every part: the list, linked crumbs, separators and the current page. -->
<template>
  <div data-specimen class="specimen">
    <Breadcrumb aria-label="Breadcrumb">
      <BreadcrumbItem href="#">Home</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem href="#">Settings</BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem current>Billing</BreadcrumbItem>
    </Breadcrumb>
  </div>
</template>

<script setup lang="ts">
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from 'vael-ui'
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
</style>
