<template>
  <section class="demo">
    <h2>Breadcrumb — a block, not a component</h2>
    <p class="note">
      The library now ships a real <code>Breadcrumb</code>/<code>BreadcrumbItem</code>/
      <code>BreadcrumbSeparator</code> set (see the dashboard demo's header for it in real use, with
      a real <code>router-link</code> crumb and a route-driven trail). This file predates that and
      still earns its keep as the hand-rolled alternative: a <code>&lt;nav&gt;</code> + ordered list
      of crumbs, a <code>Button</code> per crumb, and a separator between them, composed from
      scratch when you want something the packaged component's <code>items</code>/<code>#item</code>
      API doesn't cover — a custom overflow-collapse policy, non-link crumbs, whatever. Copy it and
      change whatever you need; nothing here depends on the shipped component existing.
    </p>

    <h3>Basic trail</h3>
    <p class="note">
      Every crumb but the last is a real link (<code>Button variant="ghost" size="sm"</code>) — the
      last crumb is plain, non-interactive text marked <code>aria-current="page"</code>, since you
      don't link to the page you're already on.
    </p>
    <nav aria-label="Breadcrumb">
      <ol class="crumb-trail">
        <li v-for="(crumb, index) in trail" :key="crumb.label" class="crumb-item">
          <Button
            v-if="index < trail.length - 1"
            variant="ghost"
            size="sm"
            class="crumb-link"
            @click="go(crumb.label)"
          >
            {{ crumb.label }}
          </Button>
          <span v-else class="crumb-current" aria-current="page">{{ crumb.label }}</span>
          <svg
            v-if="index < trail.length - 1"
            class="crumb-separator"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
      </ol>
    </nav>
    <p class="note">{{ lastVisited }}</p>

    <h3>Same recipe, different separator and icon crumbs</h3>
    <p class="note">
      Swap the SVG chevron for a literal <code>/</code>, and the plain label for an icon + label —
      still the exact same <code>&lt;nav&gt;</code>/<code>&lt;ol&gt;</code>/<code>Button</code>
      shape, just different content inside it. This is the customization a packaged component would
      have to expose as a prop API; here it's just markup.
    </p>
    <nav aria-label="Breadcrumb">
      <ol class="crumb-trail">
        <li v-for="(crumb, index) in iconTrail" :key="crumb.label" class="crumb-item">
          <Button v-if="index < iconTrail.length - 1" variant="ghost" size="sm" class="crumb-link">
            <span class="crumb-icon" aria-hidden="true">{{ crumb.icon }}</span>
            {{ crumb.label }}
          </Button>
          <span v-else class="crumb-current" aria-current="page">
            <span class="crumb-icon" aria-hidden="true">{{ crumb.icon }}</span>
            {{ crumb.label }}
          </span>
          <span v-if="index < iconTrail.length - 1" class="crumb-separator-text" aria-hidden="true">
            /
          </span>
        </li>
      </ol>
    </nav>

    <h3>Collapsing a long path behind an overflow <code>Menu</code></h3>
    <p class="note">
      A long trail is a product decision this library refuses to bake in as a threshold prop — here
      it's a plain <code>computed()</code> that collapses the middle crumbs into an "…" entry, with
      <code>Menu</code> (already in the library) providing the overflow list on click.
    </p>
    <nav aria-label="Breadcrumb">
      <ol class="crumb-trail">
        <li class="crumb-item">
          <Button variant="ghost" size="sm" class="crumb-link">{{ longTrail[0].label }}</Button>
          <svg
            class="crumb-separator"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
        <li class="crumb-item">
          <Menu :items="overflowItems">
            <template #trigger>
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label="Show hidden crumbs"
                class="crumb-link"
              >
                …
              </Button>
            </template>
          </Menu>
          <svg
            class="crumb-separator"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
        <li class="crumb-item">
          <span class="crumb-current" aria-current="page">{{ longTrail.at(-1)!.label }}</span>
        </li>
      </ol>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Menu } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'

interface Crumb {
  label: string
}

const trail: Crumb[] = [
  { label: 'Home' },
  { label: 'Settings' },
  { label: 'Account' },
  { label: 'Profile' },
]

const iconTrail: Array<Crumb & { icon: string }> = [
  { label: 'Home', icon: '🏠' },
  { label: 'Projects', icon: '📁' },
  { label: 'vael-ui', icon: '📦' },
]

const longTrail: Crumb[] = [
  { label: 'Home' },
  { label: 'Workspace' },
  { label: 'Team' },
  { label: 'Project' },
  { label: 'Sprint 42' },
  { label: 'Task' },
]

// Collapsed middle crumbs for overflow "…" menu
const overflowItems = computed<MenuItemData[]>(() =>
  longTrail.slice(1, -1).map((crumb) => ({ label: crumb.label, value: crumb.label })),
)

const lastVisited = shallowRef('No crumb clicked yet')
function go(label: string) {
  lastVisited.value = `Navigated to: ${label}`
}
</script>

<style scoped>
.crumb-trail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.125rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.crumb-item {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}
.crumb-link {
  padding-inline: 0.5rem;
}
.crumb-current {
  padding-inline: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ui-text);
}
.crumb-icon {
  margin-inline-end: 0.375rem;
}
.crumb-separator {
  color: var(--ui-text-muted);
  flex: none;
}
.crumb-separator-text {
  color: var(--ui-text-muted);
  padding-inline: 0.125rem;
}
</style>
