<template>
  <section class="demo">
    <h3>Your own text: letters rise in, tags light up</h3>
    <p class="note">
      The <code>#display</code> slot draws the field’s text yourself. vael-ui places it exactly over
      the input’s own text and scrolls it with a long value, while the real input underneath keeps
      the caret, selection, autofill and screen reader text. Here each letter rises in as you type,
      and hashtags light up. Letters animated with a transform need
      <code>display: inline-block</code>, which drops kerning, so the input turns kerning off too
      and the caret stays on the letters.
    </p>
    <Input
      v-model="text"
      class="fancy"
      placeholder="Note with #tags, e.g. ship the #launch on #friday"
      aria-label="Note"
    >
      <template #display="{ value, placeholder }">
        <span v-if="!value" class="ghost">{{ placeholder }}</span>
        <TransitionGroup v-else tag="span" name="rise">
          <span
            v-for="(char, i) in [...value]"
            :key="`${i}-${char}`"
            class="char"
            :class="{ tag: inTag[i] }"
            >{{ char }}</span
          >
        </TransitionGroup>
      </template>
    </Input>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Input } from 'vael-ui'

const text = shallowRef('Ship the #launch on #friday')
// Which characters belong to a #tag.
const inTag = computed(() => {
  const marks: boolean[] = []
  for (const match of text.value.matchAll(/#\w+/g)) {
    for (let i = 0; i < match[0].length; i++) marks[match.index! + i] = true
  }
  return marks
})
</script>

<style scoped>
.fancy {
  max-inline-size: 28rem;
}
.fancy :deep(.ui-input-el),
.fancy :deep(.ui-input-display) {
  font-kerning: none;
}
.ghost {
  color: var(--ui-text-muted);
}
.char {
  display: inline-block;
  white-space: pre;
}
.tag {
  color: var(--ui-info-text, var(--ui-info));
}
/* Only new letters rise; a deleted one leaves at once so the caret stays on the text. */
.rise-enter-active {
  transition:
    opacity 260ms var(--ui-ease-out),
    filter 260ms var(--ui-ease-out),
    translate 260ms var(--ui-ease-out);
}
.rise-enter-from {
  opacity: 0;
  filter: blur(3px);
  translate: 0 0.35em;
}
@media (prefers-reduced-motion: reduce) {
  .rise-enter-from {
    filter: none;
    translate: none;
  }
}
</style>
