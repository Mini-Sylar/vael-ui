<template>
  <section class="demo">
    <h3>A lightbox</h3>
    <p class="note">
      A photo flies from its thumbnail into a <code>Dialog</code> with <code>layoutId</code>.
      <code>usePanZoom</code> zooms it, and a drag down closes it, fading the backdrop with
      <code>mapRange</code>. The arrow keys move between photos.
    </p>
    <div class="gallery">
      <button
        v-for="photo in photos"
        :key="photo.id"
        type="button"
        class="thumb-slot"
        :aria-label="`Open ${photo.title}`"
        @click="show(photo)"
      >
        <span
          v-if="current?.id !== photo.id"
          v-animate="{ layoutId: photo.id }"
          class="photo"
          :style="{ background: photo.bg }"
        />
      </button>
    </div>

    <Dialog
      v-model:open="isOpen"
      maximized
      :show-close="false"
      :aria-label="current?.title ?? 'Photo'"
      :ui="chromeless"
      @keydown.left.prevent="move(-1)"
      @keydown.right.prevent="move(1)"
    >
      <!-- The backdrop is ours, so it can follow the drag: the Dialog's own is transparent. -->
      <div
        v-animate="{
          animate: { opacity: () => mapRange(Math.abs(drag.y.value), [0, 320], [1, 0.2]) },
        }"
        class="lightbox-backdrop"
        @click="isOpen = false"
      />
      <div ref="outer" class="lightbox-drag">
        <div ref="stage" class="lightbox-stage" aria-label="Zoomable photo">
          <div
            v-if="current"
            :key="current.id"
            v-animate="{ layoutId: current.id }"
            class="photo lightbox-photo"
            :style="{ background: current.bg }"
          />
        </div>
      </div>
      <div class="lightbox-bar">
        <Button size="sm" variant="secondary" aria-label="Previous" @click="move(-1)">‹</Button>
        <span>{{ current?.title }}</span>
        <Button size="sm" variant="secondary" aria-label="Next" @click="move(1)">›</Button>
        <Button size="sm" variant="secondary" aria-label="Zoom in" @click="pz.zoomBy(1.6)"
          >+</Button
        >
        <Button size="sm" variant="secondary" :disabled="!pz.isZoomed.value" @click="pz.reset()">
          Reset
        </Button>
        <Button size="sm" @click="isOpen = false">Close</Button>
      </div>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Button, Dialog, useDrag, usePanZoom } from 'vael-ui'
import { mapRange, vAnimate } from 'vael-ui/motion'

interface Photo {
  id: string
  title: string
  bg: string
}
// Stand-ins for photos: layered gradients, one hue each.
const photos: Photo[] = [0, 1, 2, 3, 4, 5].map((i) => ({
  id: `photo-${i}`,
  title: ['Dunes', 'Harbour', 'Orchard', 'Glacier', 'Canyon', 'Meadow'][i]!,
  bg: `radial-gradient(circle at 30% 25%, oklch(0.88 0.12 ${i * 60 + 20}), transparent 42%), radial-gradient(circle at 75% 70%, oklch(0.55 0.16 ${i * 60 + 80}), transparent 50%), linear-gradient(160deg, oklch(0.6 0.14 ${i * 60}), oklch(0.3 0.1 ${i * 60 + 40}))`,
}))

// The Dialog without its card: the photo and its controls fill the screen.
const chromeless = {
  overlay: { style: { background: 'transparent' } },
  panel: { style: { background: 'transparent', boxShadow: 'none', border: '0' } },
}

const isOpen = shallowRef(false)
const current = shallowRef<Photo | null>(null)
const stage = shallowRef<HTMLElement | null>(null)
const outer = shallowRef<HTMLElement | null>(null)

const pz = usePanZoom({ el: stage, maxScale: 5 })
// Zoomed in, a drag pans the photo; at its own size, a drag down closes the lightbox.
const drag = useDrag({
  el: outer,
  axis: 'y',
  disabled: () => pz.isZoomed.value,
  onRelease: ({ projected }) => void (Math.abs(projected.y) > 160 && (isOpen.value = false)),
})

function show(photo: Photo) {
  current.value = photo
  isOpen.value = true
}
function move(by: number) {
  if (!current.value) return
  const i = photos.findIndex((p) => p.id === current.value!.id)
  current.value = photos[(i + by + photos.length) % photos.length]!
  pz.reset({ animate: false })
}
// Closing sends the photo back to its thumbnail.
watch(isOpen, (open) => {
  if (!open) current.value = null
})
void drag
</script>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  gap: 0.5rem;
}
.thumb-slot {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
}
.photo {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  border-radius: var(--ui-radius);
}
.lightbox-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(0.12 0 0 / 0.92);
}
.lightbox-drag {
  position: absolute;
  inset: 0;
  touch-action: none;
}
/* The box you pan and zoom in: the whole screen. The photo sits in its middle. */
.lightbox-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: grab;
}
.lightbox-photo {
  inline-size: min(92vw, calc(78dvh * 4 / 3));
  block-size: auto;
  aspect-ratio: 4 / 3;
  box-shadow: 0 20px 60px -20px rgb(0 0 0 / 0.6);
}
.lightbox-bar {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: white;
  pointer-events: none;
}
.lightbox-bar > * {
  pointer-events: auto;
}
.lightbox-bar span {
  min-inline-size: 5rem;
  text-align: center;
  font-weight: 600;
}
</style>
