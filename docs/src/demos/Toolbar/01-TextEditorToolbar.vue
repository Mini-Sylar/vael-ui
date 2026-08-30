<template>
  <section class="demo">
    <h3>Text editor toolbar</h3>
    <p class="note">
      Try it with a keyboard: Tab in once (focus lands on Bold, the first button), then use ←/→ to
      move between every button in the group, Home/End jump to the first/last. Tab moves focus OUT
      of the whole toolbar to the next thing on the page, exactly like a native OS toolbar.
    </p>
    <div class="row">
      <Toolbar aria-label="Text formatting" class="editor-toolbar">
        <Button
          size="sm"
          variant="ghost"
          icon
          :aria-pressed="bold"
          aria-label="Bold"
          @click="bold = !bold"
        >
          <PhTextBolder weight="bold" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          :aria-pressed="italic"
          aria-label="Italic"
          @click="italic = !italic"
        >
          <PhTextItalic weight="bold" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          :aria-pressed="underline"
          aria-label="Underline"
          @click="underline = !underline"
        >
          <PhTextUnderline weight="bold" />
        </Button>
        <span class="ui-toolbar-separator" role="separator" />
        <Menu :items="alignItems" @select="onAlignSelect">
          <template #trigger>
            <Button size="sm" variant="ghost" icon :aria-label="`Align: ${alignLabel}`">
              <component :is="alignIcon" weight="bold" />
            </Button>
          </template>
        </Menu>
        <Button size="sm" variant="ghost" icon aria-label="Strikethrough" disabled>
          <PhTextStrikethrough weight="bold" />
        </Button>
      </Toolbar>
    </div>
    <p class="note">
      Bold: <strong>{{ bold ? 'on' : 'off' }}</strong
      >, Italic: <strong>{{ italic ? 'on' : 'off' }}</strong
      >, Underline: <strong>{{ underline ? 'on' : 'off' }}</strong
      >, Align: <strong>{{ alignLabel }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Toolbar, Menu } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import {
  PhTextAlignCenter,
  PhTextAlignLeft,
  PhTextAlignRight,
  PhTextBolder,
  PhTextItalic,
  PhTextStrikethrough,
  PhTextUnderline,
} from '@phosphor-icons/vue'

const bold = shallowRef(false)
const italic = shallowRef(false)
const underline = shallowRef(false)

const align = shallowRef<'left' | 'center' | 'right'>('left')
const alignLabel = computed(() => ({ left: 'left', center: 'center', right: 'right' })[align.value])
const alignIcon = computed(
  () =>
    ({ left: PhTextAlignLeft, center: PhTextAlignCenter, right: PhTextAlignRight })[align.value],
)
const alignItems: MenuItemData[] = [
  { label: 'Align left', value: 'left' },
  { label: 'Align center', value: 'center' },
  { label: 'Align right', value: 'right' },
]
function onAlignSelect(item: MenuItemData) {
  align.value = (item.value ?? 'left') as 'left' | 'center' | 'right'
}
</script>

<style scoped>
.editor-toolbar {
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}
</style>
