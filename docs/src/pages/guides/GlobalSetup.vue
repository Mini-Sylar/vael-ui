<template>
  <article class="prose">
    <h1>Global setup</h1>
    <p>
      Three components are singletons. Mount each one once, anywhere in your app, and every other
      component reaches it automatically. None of them need their own page in this sidebar, so
      here's everything about setting them up in one place.
    </p>

    <h2>TooltipHost</h2>
    <p>
      Powers every <code>v-tooltip</code> in your app. Without one mounted, tooltips silently do
      nothing: there's no error, they just never appear.
    </p>
    <CodeBlock
      code="<template>
  <TooltipHost />
  <YourApp />
</template>"
    />
    <p>It takes the same options every individual tooltip can override:</p>
    <MetaTable :rows="tooltipHostProps" title="Props" show-default empty-text="No props." />

    <h2>DialogHost</h2>
    <p>
      Renders whatever <code>openDialog()</code> creates imperatively (as opposed to a
      <code>&lt;Dialog v-model:open&gt;</code> you place in your own template, which doesn't need
      this). No props, no configuration, just mount it once.
    </p>
    <CodeBlock
      code="<template>
  <DialogHost />
  <YourApp />
</template>"
    />

    <h2>Toaster</h2>
    <p>
      Renders whatever <code>toast()</code> creates. This one has real configuration (position, how
      many stack before collapsing, custom animation), so it keeps
      <RouterLink to="/components/Toaster">its own page</RouterLink>.
    </p>
    <CodeBlock
      code="<template>
  <Toaster />
  <YourApp />
</template>"
    />

    <h2>All together</h2>
    <p>Mount all three once, wherever your app's root template lives:</p>
    <CodeBlock
      code="<script setup lang=&quot;ts&quot;>
import { DialogHost, Toaster, TooltipHost } from 'vael-ui'
</script>

<template>
  <TooltipHost />
  <DialogHost />
  <Toaster />
  <YourApp />
</template>"
    />
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'
import MetaTable from '../../components/MetaTable.vue'
import componentMeta from '../../generated/component-meta.json'
import type { ComponentMetaEntry } from '../../types'

const tooltipHostProps = (componentMeta as Record<string, ComponentMetaEntry>).TooltipHost.props
</script>
