<template>
  <section class="demo">
    <h3>Extreme: every level its own look</h3>
    <p class="note">
      Every level's panel carries <code>data-level</code>, so one <code>ui.panel</code> class plus
      <code>[data-level='2']</code> styles only the second menu. Here the first level is a rail of
      departments, the second a wide panel of categories with a line of description, and the third a
      list of products with prices, each arriving its own way: a <code>v-animate</code> in each
      level's row slot staggers its rows in with a different move and spring.
      <code>#item</code> gets the row's <code>path</code>, so rows read their department's color
      from it, and search results show where they live.
    </p>
    <div class="row">
      <Field label="Product">
        <CascadeSelect
          v-model="product"
          v-model:query="query"
          :items="catalogue"
          filter
          filter-placeholder="Search products"
          placeholder="Browse the store"
          :ui="{ panel: 'shop-panel' }"
        >
          <template #item="{ item, hasChildren, path }">
            <!-- Level 1: a department, with its icon. -->
            <template v-if="path.length === 0 && hasChildren">
              <component :is="item.icon" class="dept-icon" weight="duotone" aria-hidden="true" />
              <span v-animate:depts="departments" class="dept-name">{{ item.label }}</span>
              <PhCaretRight class="caret" weight="bold" aria-hidden="true" />
            </template>
            <!-- Level 2: a category, coloured by its department. -->
            <template v-else-if="hasChildren">
              <span class="cat-bar" :style="{ background: path[0]?.accent }" aria-hidden="true" />
              <span v-animate:cats="categories" class="cat-text">
                <span class="cat-name">{{ item.label }}</span>
                <span class="cat-description">{{ item.description }}</span>
              </span>
              <span class="cat-count">{{ item.children?.length }}</span>
              <PhCaretRight class="caret" weight="bold" aria-hidden="true" />
            </template>
            <!-- Level 3, and every search result: a product. -->
            <template v-else>
              <span class="dot" :style="{ background: path[0]?.accent }" aria-hidden="true" />
              <span v-animate:products="products" class="product-name">
                {{ item.label }}
                <span v-if="query" class="product-path">
                  {{ path.map((ancestor) => ancestor.label).join(' / ') }}
                </span>
              </span>
              <span class="price">{{ item.price }}</span>
            </template>
          </template>
        </CascadeSelect>
      </Field>
      <output class="panel-text">{{ product ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import type { Component } from 'vue'
import { CascadeSelect, Field, vAnimate } from 'vael-ui'
import type { CascadeSelectItem } from 'vael-ui'
import { PhCaretRight, PhHouseLine, PhLaptop, PhTent } from '@phosphor-icons/vue'

// Your own fields at any depth: departments have an icon and accent, categories a description,
// products a price. Typing the tree once lets every level's slot read them.
interface CatalogueNode extends CascadeSelectItem {
  icon?: Component
  accent?: string
  description?: string
  price?: string
  children?: CatalogueNode[]
}

const catalogue: CatalogueNode[] = [
  {
    label: 'Electronics',
    value: 'electronics',
    icon: PhLaptop,
    accent: 'oklch(0.62 0.17 255)',
    children: [
      {
        label: 'Laptops',
        value: 'laptops',
        description: 'Light machines for work and travel',
        children: [
          { label: 'Ultrabook 14', value: 'ultrabook-14', price: '$1,199' },
          { label: 'Studio 16', value: 'studio-16', price: '$2,299' },
          { label: 'Air 13', value: 'air-13', price: '$899' },
        ],
      },
      {
        label: 'Audio',
        value: 'audio',
        description: 'Headphones, speakers and mics',
        children: [
          { label: 'Studio headphones', value: 'studio-headphones', price: '$249' },
          { label: 'Desk speakers', value: 'desk-speakers', price: '$179' },
        ],
      },
    ],
  },
  {
    label: 'Home',
    value: 'home',
    icon: PhHouseLine,
    accent: 'oklch(0.66 0.15 60)',
    children: [
      {
        label: 'Kitchen',
        value: 'kitchen',
        description: 'Tools for everyday cooking',
        children: [
          { label: 'Chef knife', value: 'chef-knife', price: '$89' },
          { label: 'Cast iron pan', value: 'cast-iron-pan', price: '$59' },
        ],
      },
      {
        label: 'Lighting',
        value: 'lighting',
        description: 'Lamps for every room',
        children: [
          { label: 'Desk lamp', value: 'desk-lamp', price: '$69' },
          { label: 'Floor lamp', value: 'floor-lamp', price: '$149' },
        ],
      },
    ],
  },
  {
    label: 'Outdoors',
    value: 'outdoors',
    icon: PhTent,
    accent: 'oklch(0.62 0.15 150)',
    children: [
      {
        label: 'Camping',
        value: 'camping',
        description: 'Sleep well under the stars',
        children: [
          { label: 'Two-person tent', value: 'tent-2', price: '$219' },
          { label: 'Down sleeping bag', value: 'sleeping-bag', price: '$189' },
        ],
      },
    ],
  },
]

// Rows of each level arrive their own way: the rail glides in, categories slide out of their
// parent on a soft spring, products settle with a little bounce.
const departments = { initial: { opacity: 0, x: -6 }, stagger: 0.03 }
const categories = {
  initial: { opacity: 0, x: -12 },
  spring: { damping: 0.85, response: 0.3 },
  stagger: true,
}
const products = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  spring: { damping: 0.6, response: 0.35 },
  stagger: 0.03,
}

const product = shallowRef<string | null>(null)
const query = shallowRef('')
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.dept-icon {
  flex: none;
  font-size: 1.125rem;
}
.dept-name,
.cat-text,
.product-name {
  flex: 1;
  min-inline-size: 0;
}
.caret {
  flex: none;
  opacity: 0.6;
}
.cat-bar {
  flex: none;
  align-self: stretch;
  inline-size: 3px;
  border-radius: 2px;
}
.cat-text {
  display: flex;
  flex-direction: column;
}
.cat-name {
  font-weight: 600;
}
.cat-description {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1rem;
}
.cat-count {
  flex: none;
  min-inline-size: 1.25rem;
  padding-inline: 0.375rem;
  border-radius: 999px;
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.dot {
  flex: none;
  inline-size: 0.375rem;
  block-size: 0.375rem;
  border-radius: 50%;
}
.product-path {
  margin-inline-start: 0.375rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.price {
  flex: none;
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>

<!-- The panels are teleported, so each level is styled from here, outside the scoped styles. -->
<style>
/* Level 1: a rail in the theme's text colour, so it stands out in light and dark alike. */
.shop-panel[data-level='1'] {
  --rail: color-mix(in oklab, var(--ui-text) 90%, var(--ui-surface));
  --rail-hover: color-mix(in oklab, var(--ui-surface) 14%, var(--rail));
  /* The sliding hover highlight takes the rail's tint too. */
  --ui-indicator-bg: var(--rail-hover);
  background: var(--rail);
  color: var(--ui-surface);
}
.shop-panel[data-level='1'] .ui-menu-item {
  color: inherit;
}
.shop-panel[data-level='1'] .ui-menu-item[aria-expanded='true'] {
  background: var(--rail-hover);
}
/* The department you picked from, marked in the rail's own colours. */
.shop-panel[data-level='1'] .ui-menu-item[data-cascade-selected] {
  background: color-mix(in oklab, var(--ui-surface) 22%, transparent);
  font-weight: 600;
}
.shop-panel[data-level='1'] .ui-menu-header {
  border-color: color-mix(in oklab, var(--ui-surface) 16%, transparent);
}

/* Level 2: wide, airy rows with a line of description. */
.shop-panel[data-level='2'] {
  inline-size: 19.5rem;
}
.shop-panel[data-level='2'] .ui-menu-item {
  padding-block: 0.625rem;
}

/* Level 3: compact product rows. */
.shop-panel[data-level='3'] {
  inline-size: 15rem;
}
.shop-panel[data-level='3'] .ui-menu-item {
  padding-block: 0.375rem;
}
</style>
