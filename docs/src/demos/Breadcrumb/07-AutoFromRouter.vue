<template>
  <section class="demo">
    <h3>Auto-populated from the router</h3>
    <p class="note">
      <code>useRoute()</code> plus a small computed is all it takes. This one is wired to
      <em>this actual docs site</em>: use the sidebar or search to navigate anywhere, then look back
      here.
    </p>
    <Breadcrumb :items="routeCrumbs" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Breadcrumb } from 'vael-ui'
import type { BreadcrumbItemData } from 'vael-ui'

function titleCase(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const route = useRoute()
const routeCrumbs = computed<BreadcrumbItemData[]>(() => {
  const segments = route.path.split('/').filter(Boolean)
  const crumbs: BreadcrumbItemData[] = [{ label: 'Home', as: 'RouterLink', attrs: { to: '/' } }]
  let path = ''
  for (const segment of segments) {
    path += `/${segment}`
    crumbs.push({ label: titleCase(segment), as: 'RouterLink', attrs: { to: path } })
  }
  return crumbs
})
</script>
