<template>
  <section class="demo">
    <h3>Built from the current route</h3>
    <p class="note">
      <code>useRoute()</code> and a <code>computed</code> build the trail from the path. This one
      reads this docs site’s route: go to another page with the sidebar or search, then come back
      here.
    </p>
    <Breadcrumb :items="routeCrumbs" aria-label="Breadcrumb from the router" />
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
