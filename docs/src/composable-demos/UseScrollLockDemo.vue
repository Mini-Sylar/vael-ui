<template>
  <section class="demo">
    <h3>Lock a panel, or the page</h3>
    <p class="note">
      Each switch sets the ref <code>useScrollLock</code> returns. The panel lock targets the panel
      itself. The page lock targets <code>document.body</code>, the default: the page stops
      scrolling, and its padding grows by the scrollbar's width so nothing shifts sideways. Both
      locks release when the component unmounts.
    </p>
    <div class="row">
      <Switch v-model="panelLocked" label="Lock this panel" />
      <Switch v-model="pageLocked" label="Lock the page" />
    </div>
    <div ref="panel" class="lock-panel" tabindex="0" role="region" aria-label="Release notes">
      <p v-for="n in 12" :key="n">
        Release {{ 13 - n }}: fixes, smaller bundles and a few new props. Scroll this panel, then
        lock it and try again.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Switch, useScrollLock } from 'vael-ui'

const panel = useTemplateRef<HTMLElement>('panel')
const panelLocked = useScrollLock({ target: panel })
const pageLocked = useScrollLock()
</script>

<style scoped>
.lock-panel {
  max-inline-size: 28rem;
  max-block-size: 10rem;
  overflow-y: auto;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
