<!-- Kbd in a shortcut list: one key per Kbd, so a chord shows each of its keys. -->
<template>
  <div data-specimen class="specimen">
    <dl class="shortcuts">
      <dt><Kbd>⌘</Kbd><Kbd>K</Kbd></dt>
      <dd>Search</dd>
      <dt><Kbd>Esc</Kbd></dt>
      <dd>Close the panel</dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { Kbd } from 'vael-ui'
</script>

<style scoped>
.specimen {
  inline-size: min(18rem, 100%);
}

.shortcuts {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.75rem 1rem;
  margin: 0;
  font-size: 0.875rem;
}

.shortcuts dt {
  display: flex;
  gap: 0.25rem;
}

.shortcuts dd {
  margin: 0;
  color: var(--ui-text-muted);
}
</style>
