<template>
  <article class="prose">
    <h1>Styling and cascade layers</h1>
    <p>
      vael-ui ships in <code>@layer ui-components</code>. Unlayered CSS always wins over a layer
      regardless of specificity, so a plain, unlayered base reset silently overrides vael-ui
      internals. Fix: put your base styles in a layer too, ordered first.
    </p>

    <CodeBlock
      code="/* your app's main stylesheet, e.g. style.css */
@layer app-base, ui-components;

@layer app-base {
  * { margin: 0; box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
}"
    />
    <CodeBlock
      lang="typescript"
      code="// main.ts
import './style.css'        // your base layer, loads first
import 'vael-ui/style.css'  // now sorts after app-base"
    />

    <p>
      Two files, that's it. Import order here only controls layer position, nothing else, an
      unlayered override anywhere always still wins regardless of load order.
    </p>

    <p>
      Deliberately overriding one component (<code>ui</code> prop, a Tailwind utility) wants your
      rule to win, keep that CSS unlayered as it already is by default. See
      <RouterLink to="/docs/guides/tailwind">Using with Tailwind</RouterLink>.
    </p>
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'
</script>
