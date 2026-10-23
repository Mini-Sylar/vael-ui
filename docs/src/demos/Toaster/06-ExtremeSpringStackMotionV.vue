<template>
  <section class="demo">
    <h3>Extreme: toasts that spring in from their edge (motion-v)</h3>
    <p class="note">
      A <code>motion</code> object with <code>enter</code> and <code>leave</code> hooks hands each
      card to motion's <code>animate()</code>. Toasts spring up from the bottom edge and slide back
      out the same way. This Toaster has its own <code>name</code>, so other Toasters on the page
      never show its toasts.
    </p>
    <div class="row">
      <Button @click="send">Send a toast</Button>
      <Button variant="secondary" @click="sendThree">Send three</Button>
    </div>
    <Toaster
      name="spring"
      aria-label="Spring notifications"
      position="bottom-center"
      :motion="cardsMotion"
    />
  </section>
</template>

<script setup lang="ts">
import { animate } from 'motion-v'
import type { AnimationPlaybackControls } from 'motion-v'
import { Button, Toaster, toast } from 'vael-ui'
import type { ToasterMotion } from 'vael-ui'

const messages = ['Draft saved', 'Invite sent to Sam', 'Build passed', 'Backup complete']
let count = 0

function send() {
  toast.success(messages[count++ % messages.length], { toaster: 'spring' })
}
function sendThree() {
  for (let i = 0; i < 3; i++) send()
}

// How far off its rest spot each card sits: 1 is fully past its edge, 0 is at rest.
const cards = new WeakMap<Element, { offset: number; motion: AnimationPlaybackControls | null }>()

// The stack's own `translate`, `scale` and `--toast-opacity` keep working underneath; this
// only writes `transform` and `opacity`, from one value so the fade never drifts from the slide.
function draw(el: HTMLElement, offset: number) {
  const sign = el.dataset.yPosition === 'top' ? -1 : 1
  el.style.transform = `translateY(${sign * offset * 100}%)`
  // A card that re-enters behind the front one keeps the stack's dimmer opacity.
  const rest = Number(el.style.getPropertyValue('--toast-opacity') || 1)
  el.style.opacity = String(rest * Math.min(Math.max(1 - offset / 0.6, 0), 1))
}

function slide(el: HTMLElement, from: number, to: number, options: object) {
  const card = cards.get(el) ?? { offset: from, motion: null }
  cards.set(el, card)
  card.motion?.stop()
  // The card's CSS transitions `transform` and `opacity`, which would smear every frame we write.
  el.style.transitionProperty = 'translate, scale, block-size'
  draw(el, card.offset)
  const controls = animate(card.offset, to, {
    ...options,
    onUpdate: (offset) => {
      card.offset = offset
      draw(el, offset)
    },
    onComplete: () => {
      for (const prop of ['transform', 'opacity', 'transition-property']) {
        el.style.removeProperty(prop)
      }
      cards.delete(el)
    },
  })
  card.motion = controls
  // Returned, so the Toaster waits for it.
  return controls
}

const cardsMotion: ToasterMotion = {
  enter: ({ toast }) =>
    slide(toast, 1, 0, {
      type: 'spring',
      bounce: 0.15,
      visualDuration: 0.35,
      restDelta: 0.005,
      restSpeed: 0.05,
    }),
  leave({ toast }) {
    // A card closed mid-entrance starts from its current offset, so it covers less ground.
    const offset = cards.get(toast)?.offset ?? 0
    return slide(toast, offset, 1, {
      duration: 0.2 * (1 - offset) + 0.05,
      ease: [0.23, 1, 0.32, 1],
    })
  },
}
</script>
