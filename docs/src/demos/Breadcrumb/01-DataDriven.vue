<template>
  <section class="demo">
    <h3>Built from <code>items</code>, with icons</h3>
    <p class="note">
      The last item is <code>current</code> unless you set it. <code>attrs</code> passes extra
      attributes to each <code>BreadcrumbItem</code>. There’s no <code>href</code> field, because
      the link prop depends on <code>as</code>: <code>href</code> for a plain link,
      <code>to</code> for a router link.
    </p>
    <Breadcrumb :items="itemsData" aria-label="Breadcrumb with icons" />
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
