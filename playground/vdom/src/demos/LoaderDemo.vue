<template>
  <section class="demo">
    <h2>Loader</h2>
    <p class="note">
      The same <code>.ui-loader</code> ring Button's overlay fallback and Toaster's loading variant
      render internally, extracted into its own component. Not a presence component — nothing to
      force-mount or defer; you control when it exists in the DOM.
    </p>

    <h3>Sizes — <code>size</code> sets font-size, the ring is 1em</h3>
    <div class="row">
      <Loader size="0.875rem" />
      <Loader size="1.25rem" />
      <Loader size="2rem" />
    </div>

    <h3>Accessible name — <code>label</code> renders role="status" + visually-hidden text</h3>
    <div class="row">
      <Loader label="Loading results" />
      <span class="panel-text"
        >↑ has an accessible name even though nothing is visibly labeled</span
      >
    </div>

    <h3>Inside a labeled control — <code>aria-hidden</code> by default</h3>
    <p class="note">
      Without <code>label</code>, the root is <code>aria-hidden="true"</code> — the common case is a
      loader living next to visible text, or inside an already-labeled control like Button (which is
      exactly where this component's markup came from).
    </p>
    <div class="row">
      <span class="loader-with-text"><Loader /> Fetching…</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Loader } from 'vael-ui'
</script>

<style scoped>
.loader-with-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.875rem;
}
</style>
