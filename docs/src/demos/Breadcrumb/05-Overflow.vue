<template>
  <section class="demo">
    <h3>Overflow: default scroll vs. <code>wrap</code></h3>
    <p class="note">
      Default (<code>wrap</code> false): a single line that scrolls horizontally once it overflows
      its container, edge-faded so there's a visible cue there's more. Set <code>wrap</code> to
      break onto multiple lines instead.
    </p>
    <p class="note">Scrolls (default):</p>
    <Breadcrumb class="breadcrumb-narrow">
      <template v-for="(crumb, i) in longTrail" :key="crumb">
        <BreadcrumbItem v-if="i < longTrail.length - 1" href="#">{{ crumb }}</BreadcrumbItem>
        <BreadcrumbItem v-else current>{{ crumb }}</BreadcrumbItem>
        <BreadcrumbSeparator v-if="i < longTrail.length - 1" />
      </template>
    </Breadcrumb>
    <p class="note">Wraps:</p>
    <Breadcrumb wrap class="breadcrumb-narrow">
      <template v-for="(crumb, i) in longTrail" :key="crumb">
        <BreadcrumbItem v-if="i < longTrail.length - 1" href="#">{{ crumb }}</BreadcrumbItem>
        <BreadcrumbItem v-else current>{{ crumb }}</BreadcrumbItem>
        <BreadcrumbSeparator v-if="i < longTrail.length - 1" />
      </template>
    </Breadcrumb>
  </section>
</template>

<script setup lang="ts">
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from 'vael-ui'

const longTrail = ['Home', 'Workspace', 'Projects', 'Marketing Site', 'Components', 'Breadcrumb']
</script>

<style scoped>
.breadcrumb-narrow {
  max-inline-size: 20rem;
  margin-block-end: 1rem;
}
</style>
