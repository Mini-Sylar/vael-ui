<template>
  <section class="demo">
    <h3>Your own loader, app-wide</h3>
    <p class="note">
      <code>loader-type</code> also takes your own component. vael-ui draws it in the same
      <code>1em</code> box as the built-in ones, sized by the text and colored with
      <code>currentColor</code>, so Button’s loading state, list loading rows, loading toasts and
      PullToRefresh all use it. To pass props, use a render function:
      <code>() =&gt; h(MySpinner, { speed: 2 })</code>. You don’t need <code>markRaw</code>: only a
      component you keep in your own <code>ref()</code> or <code>reactive()</code> becomes reactive,
      and vael-ui unwraps that too.
    </p>
    <ConfigProvider :loader-type="OrbitLoader">
      <div class="row">
        <Loader size="1.75rem" label="Loading" />
        <Button loading>Saving</Button>
        <Button loading variant="secondary" loader="inline">Uploading</Button>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { Button, ConfigProvider, Loader } from 'vael-ui'

// Your own spinner: any component. This one orbits two dots, and fills the 1em box it's given.
const OrbitLoader = () =>
  h('svg', { viewBox: '0 0 24 24', class: 'orbit-loader', 'aria-hidden': 'true' }, [
    h('circle', { cx: 12, cy: 4, r: 3, fill: 'currentColor' }),
    h('circle', { cx: 12, cy: 20, r: 3, fill: 'currentColor', opacity: 0.4 }),
  ])
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
:deep(.orbit-loader) {
  animation: orbit 800ms linear infinite;
}
@keyframes orbit {
  to {
    rotate: 1turn;
  }
}
@media (prefers-reduced-motion: reduce) {
  :deep(.orbit-loader) {
    animation-duration: 2400ms;
  }
}
</style>
