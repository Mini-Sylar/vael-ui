<template>
  <section class="demo">
    <h3>A card deck</h3>
    <p class="note">
      Throw the top card past either side, or let go near the middle to send it back.
      <code>onRelease</code> decides from where the throw lands. Live values in
      <code>v-animate</code> tilt the card and lift the stack. A card's <code>exit</code> keeps the
      speed you threw it at. Undo flies a card back in with <code>initial</code>.
    </p>
    <div class="deck">
      <article
        v-for="(card, i) in cards"
        :key="card.name"
        :ref="(el) => cardRef(el as HTMLElement | null, card)"
        v-animate="{
          animate: {
            rotate: () => (i === 0 ? mapRange(drag.x.value, [-width(), width()], [-12, 12]) : 0),
            scale: { value: () => mapRange(slot(i), [0, 3], [1, 0.82]), spring: true },
            opacity: { value: () => mapRange(slot(i), [2, 3], [1, 0]), spring: true },
          },
          initial: () => (back ? { x: back * far(), rotate: back * 25, opacity: 0 } : {}),
          exit: () => ({
            x: { value: gone * far(), spring: 'smooth' },
            rotate: { value: gone * 25, spring: 'smooth' },
            opacity: { value: 0, duration: 450, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' },
          }),
        }"
        class="deck-card"
        :class="{ 'deck-card--top': i === 0 }"
        :style="{ '--hue': card.hue, zIndex: cards.length - i }"
      >
        <h4>{{ card.name }}</h4>
        <p>{{ card.note }}</p>
      </article>
      <p v-if="!cards.length" class="deck-empty">That's everyone.</p>
    </div>
    <div class="deck-controls">
      <Button size="sm" variant="secondary" :disabled="!cards.length" @click="take(-1)">
        Pass
      </Button>
      <Button size="sm" variant="ghost" :disabled="!history.length" @click="undo">Undo</Button>
      <Button size="sm" :disabled="!cards.length" @click="take(1)">Like</Button>
    </div>
    <p class="deck-readout" aria-live="polite">Liked: {{ liked.join(', ') || 'nobody yet' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Button, useDrag, useHaptic } from 'vael-ui'
import { mapRange, vAnimate } from 'vael-ui/motion'

interface Card {
  name: string
  note: string
  hue: number
}
const cards = shallowRef<Card[]>([
  { name: 'Ana Ruiz', note: 'Bakes sourdough on Sundays', hue: 20 },
  { name: 'Tom Okafor', note: 'Collects old film cameras', hue: 140 },
  { name: 'Priya Nair', note: 'Runs before sunrise', hue: 260 },
  { name: 'Mira Chen', note: 'Learning the cello', hue: 320 },
  { name: 'Kai Jensen', note: 'Grows tomatoes on a balcony', hue: 80 },
])
const history = shallowRef<{ card: Card; liked: boolean }[]>([])
const liked = computed(() => history.value.filter((h) => h.liked).map((h) => h.card.name))
const top = shallowRef<HTMLElement | null>(null)
// The top card's element, for the drag. A card only claims it on top; Vue calls a removed card's
// ref with null after the next one has claimed it, so that never clears it.
function cardRef(el: HTMLElement | null, card: Card) {
  if (el && card === cards.value[0]) top.value = el
}
watch(cards, (list) => list.length || (top.value = null))
const haptic = useHaptic()

const width = () => top.value?.offsetWidth ?? 300
const far = () => width() * 1.6

const drag = useDrag({
  el: top,
  // Where the throw would land, not where the finger let go: a flick counts.
  onRelease: ({ projected }) =>
    void (Math.abs(projected.x) >= width() * 0.4 && take(Math.sign(projected.x))),
})

// Each card's place in the stack: 0 on top, 3 hidden at the back. Dragging the top card lifts
// the rest toward it; when one leaves, the springs carry each card up to its new place.
const slot = (i: number) => (i === 0 ? 0 : i - Math.min(1, Math.abs(drag.x.value) / width()))

// Which way the card leaving goes, and which way an undone card comes back from: read by its
// `exit` and `initial` as they start.
let gone = 1
let back = 0

function take(dir: number) {
  const [card, ...rest] = cards.value
  if (!card) return
  gone = dir
  haptic.impact('light')
  history.value = [...history.value, { card, liked: dir > 0 }]
  cards.value = rest
}

function undo() {
  const last = history.value.at(-1)
  if (!last) return
  back = last.liked ? 1 : -1
  history.value = history.value.slice(0, -1)
  cards.value = [last.card, ...cards.value]
}
</script>

<style scoped>
.deck {
  position: relative;
  block-size: 17rem;
  max-inline-size: 20rem;
  margin-inline: auto;
}
.deck-card {
  position: absolute;
  inset: 0 0 2.75rem;
  /* Scaled about a point below it, a card further back is smaller and lower: it peeks out under
     the one in front, and the drag keeps translate to itself. */
  transform-origin: 50% 160%;
  display: grid;
  align-content: end;
  gap: 0.25rem;
  padding: 1.25rem;
  border-radius: calc(var(--ui-radius) * 2);
  color: white;
  background: linear-gradient(160deg, oklch(0.65 0.14 var(--hue)), oklch(0.42 0.13 var(--hue)));
  box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.4);
  user-select: none;
}
.deck-card--top {
  cursor: grab;
}
.deck-card h4,
.deck-card p {
  margin: 0;
}
.deck-card p {
  opacity: 0.85;
}
.deck-empty {
  display: grid;
  place-items: center;
  block-size: 100%;
  margin: 0;
  color: var(--ui-muted-foreground);
}
.deck-controls {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}
.deck-readout {
  margin: 0;
  text-align: center;
}
</style>
