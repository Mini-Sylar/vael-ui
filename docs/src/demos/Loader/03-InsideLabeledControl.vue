<template>
  <section class="demo">
    <h3>Inside a labeled control, <code>aria-hidden</code> by default</h3>
    <p class="note">
      Without <code>label</code>, the root is <code>aria-hidden="true"</code>, the common case is a
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
