<template>
  <article class="prose">
    <h1>Global setup</h1>
    <p>
      Three singletons. Mount each once, anywhere in your app, and every other component reaches it
      automatically.
    </p>

    <h2>TooltipHost</h2>
    <p>Powers every <code>v-tooltip</code>. Without one mounted, tooltips silently never appear.</p>
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
      Renders whatever <code>openDialog()</code> creates imperatively. Not needed for a
      <code>&lt;Dialog v-model:open&gt;</code> in your own template. No props, no configuration.
    </p>
    <CodeBlock
      code="<template>
  <DialogHost />
  <YourApp />
</template>"
    />

    <h2>Toaster</h2>
    <p>
      Renders whatever <code>toast()</code> creates. Has real configuration, so it keeps
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
