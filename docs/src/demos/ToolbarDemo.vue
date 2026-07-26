<template>
  <section class="demo">
    <h2>Toolbar</h2>
    <p class="note">
      Arrow keys move a roving <code>tabindex</code> across whatever heterogeneous controls you
      render inside, plain buttons, a toggle button, a <code>Menu</code> trigger. Membership is
      discovered from the real DOM (a <code>MutationObserver</code> re-scans on mount/unmount), not
      from a declared items list. No animation of any kind, focus moves too often for that tier, the
      only motion is each child's own press feedback.
    </p>

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

    <h3>Vertical orientation</h3>
    <p class="note">↑/↓ move focus instead of ←/→, Home/End still jump to the ends.</p>
    <div class="row">
      <Toolbar aria-label="Page tools" orientation="vertical" class="toolbar-vertical">
        <Button size="sm" variant="ghost" icon aria-label="Cut">
          <PhScissors weight="bold" />
        </Button>
        <Button size="sm" variant="ghost" icon aria-label="Copy">
          <PhCopy weight="bold" />
        </Button>
        <Button size="sm" variant="ghost" icon aria-label="Paste">
          <PhClipboardText weight="bold" />
        </Button>
      </Toolbar>
    </div>

    <h3>Responsive overflow</h3>
    <p class="note">
      <code>#start</code>/<code>#center</code>/<code>#end</code> slots lay out a document-style
      toolbar; drag the resize handle in the box's bottom-right corner to shrink it. Only the
      <code>#end</code> buttons marked <code>data-toolbar-overflow</code> collapse right-to-left
      into the "…" menu once they stop fitting, they stay mounted, just visually hidden, so state
      like the click counts below survives a collapse/expand round trip.
    </p>
    <div class="row">
      <div class="resizable">
        <Toolbar aria-label="Document toolbar">
          <template #start>
            <Button size="sm" variant="ghost">Q3 Roadmap.doc</Button>
          </template>
          <template #center>
            <Button size="sm" variant="ghost" icon aria-label="Zoom out">
              <PhMinus weight="bold" />
            </Button>
          </template>
          <template #end>
            <Button size="sm" variant="ghost" data-toolbar-overflow @click="share++"
              >Share ({{ share }})</Button
            >
            <Button size="sm" variant="ghost" data-toolbar-overflow @click="comment++"
              >Comment ({{ comment }})</Button
            >
            <Button size="sm" variant="ghost" data-toolbar-overflow disabled>Export</Button>
          </template>
        </Toolbar>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Toolbar, Menu } from 'vael-ui'
import type { MenuItemData } from 'vael-ui'
import {
  PhClipboardText,
  PhCopy,
  PhMinus,
  PhScissors,
  PhTextAlignCenter,
  PhTextAlignLeft,
  PhTextAlignRight,
  PhTextBolder,
  PhTextItalic,
  PhTextStrikethrough,
  PhTextUnderline,
} from '@phosphor-icons/vue'

const share = shallowRef(0)
const comment = shallowRef(0)

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
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.toolbar-vertical {
  inline-size: 3rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.resizable {
  overflow: auto;
  resize: horizontal;
  min-inline-size: 220px;
  max-inline-size: 100%;
  inline-size: 480px;
  padding: 0.5rem;
  border: 1px dashed var(--ui-border);
}
</style>
