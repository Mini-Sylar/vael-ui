<template>
  <section class="demo">
    <h3>Inside a labeled control: <code>aria-hidden</code> by default</h3>
    <p class="note">
      Without <code>label</code>, the root has <code>aria-hidden="true"</code>. That covers the
      usual case: a loader next to visible text, or inside a control that already has a label, such
      as Button.
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
