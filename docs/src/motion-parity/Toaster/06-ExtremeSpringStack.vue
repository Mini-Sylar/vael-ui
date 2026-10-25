<template>
  <section class="demo">
    <h3>Extreme: toasts that spring in from their edge</h3>
    <p class="note">
      A <code>motion</code> object gives the <code>toast</code> part an entrance and an exit. Toasts
      spring up from the bottom edge, showing once they're partway up, and slide back out the same
      way, gone from sight early. This Toaster has its own <code>name</code>, so other Toasters on
      the page never show its toasts.
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

// In: the slide rides a spring and the fade waits until it's 40% of the way up. Out: an eased slide
// that's out of sight by its first quarter. `transform` adds to the stack's own `translate`.
const cardsMotion: ToasterMotion = {
  stagger: 0,
  initial: {
    toast: {
      transform: { value: 'translateY(100%)', spring: { damping: 0.85, response: 0.42 } },
      opacity: { value: 0, duration: 250, delay: 0.08, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
    },
  },
  exit: {
    toast: {
      transform: { value: 'translateY(100%)', duration: 250, easing: 'out' },
      opacity: { value: 0, duration: 62, easing: 'ease-in' },
    },
  },
}
</script>
