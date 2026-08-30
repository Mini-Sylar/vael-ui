<template>
  <section class="demo">
    <h3><code>items</code>: data-driven, with icons</h3>
    <p class="note">
      The last item defaults to <code>current</code> if you don't set it explicitly.
      <code>attrs</code> forwards anything extra straight to <code>BreadcrumbItem</code> —
      deliberately not a dedicated <code>href</code> field, since the right prop name depends on
      <code>as</code> (<code>href</code> for a plain link, <code>to</code> for a router one); baking
      in one would silently break the other.
    </p>
    <Breadcrumb :items="itemsData" />
  </section>
</template>

<script setup lang="ts">
import { Breadcrumb } from 'vael-ui'
import type { BreadcrumbItemData } from 'vael-ui'
import { PhFolder, PhHouse } from '@phosphor-icons/vue'

const itemsData: BreadcrumbItemData[] = [
  { label: 'Home', icon: PhHouse, attrs: { href: '/' } },
  { label: 'Docs', icon: PhFolder, attrs: { href: '/docs' } },
  { label: 'Breadcrumb' },
]
</script>
