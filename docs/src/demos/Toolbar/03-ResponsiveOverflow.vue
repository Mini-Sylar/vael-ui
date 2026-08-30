<template>
  <section class="demo">
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
import { shallowRef } from 'vue'
import { Button, Toolbar } from 'vael-ui'
import { PhMinus } from '@phosphor-icons/vue'

const share = shallowRef(0)
const comment = shallowRef(0)
</script>

<style scoped>
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
