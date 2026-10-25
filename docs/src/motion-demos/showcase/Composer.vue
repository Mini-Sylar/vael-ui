<!-- A reply box that stays one quiet row until focused, then opens its tools and moves Reply down. -->
<template>
  <section class="demo">
    <h3>Reply composer</h3>
    <Textarea
      v-model="text"
      auto-grow
      :rows="1"
      :max-rows="8"
      placeholder="Post your reply"
      class="reply"
      @focus="focused = true"
      @blur="focused = false"
    >
      <template #start><Avatar name="Sam Rivera" size="sm" /></template>
      <template #end>
        <!-- One Reply button: in the row at rest, sliding down to the actions when open. -->
        <Button
          v-if="!open"
          v-animate.snappy="{ layoutId: 'reply' }"
          size="sm"
          disabled
          tabindex="-1"
          >Reply</Button
        >
      </template>
      <template #bottom-start>
        <div v-animate.size.snappy>
          <div v-if="open" class="tools">
            <Button
              v-for="tool in tools"
              :key="tool.label"
              v-animate:tools.drop.snappy.stagger
              size="sm"
              variant="ghost"
              icon
              :aria-label="tool.label"
            >
              <component :is="tool.icon" />
            </Button>
          </div>
        </div>
      </template>
      <template #bottom-end>
        <div v-animate.size.snappy>
          <div v-if="open" class="actions">
            <span class="left">{{ 280 - text.length }}</span>
            <Button v-animate.snappy="{ layoutId: 'reply' }" size="sm" :disabled="!text.trim()"
              >Reply</Button
            >
          </div>
        </div>
      </template>
    </Textarea>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Avatar, Button, Textarea, vAnimate } from 'vael-ui'
import { PhChartBar, PhImage, PhSmiley } from '@phosphor-icons/vue'

const text = shallowRef('')
const focused = shallowRef(false)
const open = computed(() => focused.value || !!text.value)
const tools = [
  { label: 'Image', icon: PhImage },
  { label: 'Emoji', icon: PhSmiley },
  { label: 'Poll', icon: PhChartBar },
]
</script>

<style scoped>
.demo {
  display: grid;
  place-items: center;
  min-block-size: 12rem;
}
.reply {
  inline-size: min(28rem, 100%);
}
.tools,
.actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.actions {
  gap: 0.75rem;
}
.left {
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
