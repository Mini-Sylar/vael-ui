<template>
  <section class="demo">
    <h2>Input</h2>
    <p class="note">
      <code>inheritAttrs: false</code> — the native <code>&lt;input&gt;</code> gets
      <code>maxlength</code>/<code>autocomplete</code>/<code>name</code>/listeners, the root frame
      gets <code>class</code>/<code>style</code>. Clicking anywhere on the frame focuses the input,
      unless the click lands on an interactive <code>#start</code>/<code>#end</code> child.
    </p>

    <h3>Sizes</h3>
    <div class="row">
      <Input v-model="sizeValue" size="sm" placeholder="Small" />
      <Input v-model="sizeValue" size="md" placeholder="Medium" />
      <Input v-model="sizeValue" size="lg" placeholder="Large" />
    </div>

    <h3><code>#start</code> / <code>#end</code> slots</h3>
    <p class="note">The library owns the wrapper spans — icons/kbd hints only fill them.</p>
    <div class="row">
      <Input v-model="searchValue" placeholder="Search…" class="input-fixed">
        <template #start>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M13 13l-2.5-2.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </template>
        <template #end>
          <kbd class="input-kbd">⌘K</kbd>
        </template>
      </Input>
      <Input v-model="copyValue" placeholder="Click the button, not the frame" class="input-fixed">
        <template #end>
          <Button size="sm" variant="ghost" icon aria-label="Copy" @click="onCopyClick">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none">
              <rect
                x="5"
                y="5"
                width="8"
                height="8"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path d="M3 10V4a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </Button>
        </template>
      </Input>
    </div>
    <p class="note">Copy button clicks: {{ copyClicks }}</p>

    <h3>States</h3>
    <div class="row">
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Readonly" readonly model-value="Can't edit this" />
      <Input placeholder="Invalid" invalid />
    </div>

    <h3>v-model modifiers</h3>
    <div class="row">
      <Input
        v-model.trim="trimValue"
        placeholder=".trim — try leading/trailing spaces"
        class="input-fixed"
      />
      <Input v-model.lazy="lazyValue" placeholder=".lazy — commits on blur" class="input-fixed" />
    </div>
    <p class="note">trim: "{{ trimValue }}" · lazy: "{{ lazyValue }}"</p>

    <h3>Full restyle via <code>ui.root</code> — underline/filled, no <code>!important</code></h3>
    <p class="note">
      Library styles live in <code>@layer ui-components</code>, so any unlayered consumer rule
      outranks them regardless of specificity — one class swaps the whole box treatment (muted fill,
      bottom border only, square corners), and the focus states re-skin the same way.
    </p>
    <Input
      v-model="underlineValue"
      placeholder="Underline style"
      :ui="{ root: 'underline-input' }"
      class="input-fixed"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Input } from 'vael-ui'

const sizeValue = shallowRef('')
const searchValue = shallowRef('')
const copyValue = shallowRef('https://vael-ui.dev')
const copyClicks = shallowRef(0)
function onCopyClick() {
  copyClicks.value++
}
const trimValue = shallowRef('')
const lazyValue = shallowRef('')
const underlineValue = shallowRef('')
</script>

<style scoped>
.input-fixed {
  max-width: 16rem;
}
/* Scoped outranks @layer (scoped attribute selectors are unlayered) */
.underline-input {
  border: none;
  border-block-end: 1px solid var(--ui-border-strong);
  border-radius: 0;
  background: var(--ui-muted);
}
.underline-input:focus-within {
  border-block-end-color: var(--ui-primary);
}
.underline-input[data-focus-visible] {
  outline-offset: 0;
}
.input-kbd {
  font: inherit;
  font-size: 0.6875rem;
  padding: 0.0625rem 0.375rem;
  border: 1px solid var(--ui-border-strong);
  border-radius: 4px;
  color: var(--ui-text-muted);
}
</style>
