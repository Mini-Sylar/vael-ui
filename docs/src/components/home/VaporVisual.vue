<template>
  <div ref="root" class="vapor-visual">
    <SelectButton
      v-model="mode"
      size="sm"
      :allow-empty="false"
      :items="[
        { label: 'Vue DOM', value: 'vdom' },
        { label: 'Vapor', value: 'vapor' },
      ]"
      @update:model-value="touched = true"
    />
    <code class="import-line">
      <span class="kw">import</span> { Button } <span class="kw">from</span>{{ ' ' }}
      <span class="str"
        >'vael-ui<TransitionGroup name="suffix"
          ><span v-if="mode === 'vapor'" key="vapor" class="suffix">/vapor</span></TransitionGroup
        >'</span
      >
    </code>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { SelectButton } from 'vael-ui'
import { useLiveCard, useTicker } from './useLiveCard'

const root = useTemplateRef<HTMLElement>('root')
const { active } = useLiveCard(root)
const mode = shallowRef<'vdom' | 'vapor'>('vdom')
// Flips on its own until you pick one yourself.
const touched = shallowRef(false)
useTicker(
  () => active.value && !touched.value,
  2600,
  () => (mode.value = mode.value === 'vdom' ? 'vapor' : 'vdom'),
)
</script>

<style scoped>
.vapor-visual {
  display: grid;
  justify-items: center;
  gap: 0.9rem;
}

.import-line {
  font-size: 0.8rem;
  white-space: nowrap;
  color: var(--ui-text);
}

.kw {
  color: color-mix(in oklch, var(--ui-danger) 80%, var(--ui-text));
}

.str {
  color: color-mix(in oklch, var(--ui-info) 85%, var(--ui-text));
}

.suffix {
  display: inline-block;
}

.suffix-enter-active,
.suffix-leave-active {
  transition:
    opacity 220ms var(--ui-ease-out),
    filter 220ms var(--ui-ease-out),
    max-width 260ms var(--ui-ease-out);
  overflow: hidden;
  vertical-align: bottom;
}

.suffix-enter-from,
.suffix-leave-to {
  opacity: 0;
  filter: blur(4px);
  max-width: 0;
}

.suffix-enter-to,
.suffix-leave-from {
  max-width: 4em;
}
</style>
