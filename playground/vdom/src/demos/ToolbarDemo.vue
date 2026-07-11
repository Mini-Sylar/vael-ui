<template>
  <section class="demo">
    <h2>Toolbar</h2>
    <p class="note">
      Arrow keys move a roving <code>tabindex</code> across whatever heterogeneous controls you
      render inside — plain buttons, a toggle button, a <code>Menu</code> trigger. Membership is
      discovered from the real DOM (a <code>MutationObserver</code> re-scans on mount/unmount), not
      from a declared items list. No animation of any kind — focus moves too often for that tier
      (see <code>useToolbar.ts</code>); the only motion is each child's own press feedback.
    </p>

    <h3>Text formatting — buttons, a toggle, a separator, a Menu trigger, a disabled control</h3>
    <div class="row">
      <Toolbar aria-label="Text formatting">
        <Button
          size="sm"
          variant="ghost"
          icon
          :aria-pressed="bold"
          aria-label="Bold"
          @click="bold = !bold"
        >
          <strong>B</strong>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          :aria-pressed="italic"
          aria-label="Italic"
          @click="italic = !italic"
        >
          <em>I</em>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          :aria-pressed="underline"
          aria-label="Underline"
          @click="underline = !underline"
        >
          <span style="text-decoration: underline">U</span>
        </Button>
        <span class="ui-toolbar-separator" role="separator" />
        <Menu :items="alignItems" @select="onAlignSelect">
          <template #trigger>
            <Button size="sm" variant="ghost">{{ alignLabel }}</Button>
          </template>
        </Menu>
        <Button size="sm" variant="ghost" disabled>Strikethrough</Button>
      </Toolbar>
    </div>
    <p class="note">
      Bold: <strong>{{ bold ? 'on' : 'off' }}</strong
      >, Italic: <strong>{{ italic ? 'on' : 'off' }}</strong
      >, Underline: <strong>{{ underline ? 'on' : 'off' }}</strong
      >, Align: <strong>{{ alignLabel }}</strong>
    </p>

    <h3>Vertical orientation — <code>orientation="vertical"</code></h3>
    <p class="note">↑/↓ move focus instead of ←/→; Home/End still jump to the ends.</p>
    <div class="row">
      <Toolbar aria-label="Side actions" orientation="vertical" class="toolbar-vertical">
        <Button size="sm" variant="ghost">Cut</Button>
        <Button size="sm" variant="ghost">Copy</Button>
        <Button size="sm" variant="ghost">Paste</Button>
      </Toolbar>
    </div>

    <h3>
      <code>#start</code>/<code>#center</code>/<code>#end</code> layout, with overflow collapse
    </h3>
    <p class="note">
      Drag the handle to shrink the toolbar. Only the <code>#end</code> buttons marked
      <code>data-toolbar-overflow</code> collapse (right-to-left) into the "…" menu — they stay
      mounted, just visually hidden, so state like the click count below survives a collapse/expand
      round trip.
    </p>
    <div class="row">
      <div class="resizable">
        <Toolbar aria-label="Document toolbar">
          <template #start>
            <Button size="sm" variant="ghost">Untitled document</Button>
          </template>
          <template #center>
            <Button size="sm" variant="ghost" icon aria-label="Zoom out">−</Button>
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

const share = shallowRef(0)
const comment = shallowRef(0)

const bold = shallowRef(false)
const italic = shallowRef(false)
const underline = shallowRef(false)

const align = shallowRef<'left' | 'center' | 'right'>('left')
const alignLabel = computed(
  () => ({ left: 'Align left', center: 'Align center', right: 'Align right' })[align.value],
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
.toolbar-vertical {
  inline-size: 8rem;
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
