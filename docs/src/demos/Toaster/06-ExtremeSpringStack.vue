<template>
  <section class="demo">
    <h3>Extreme: toasts that spring in from their edge</h3>
    <p class="note">
      A <code>motion</code> object gives the <code>toast</code> part an entrance and an exit. Toasts
      spring up from the bottom edge with a touch of give, <code>stagger</code> spaces a burst, and
      each slides back out quicker than it came. This Toaster has its own <code>name</code>, so
      other Toasters on the page never show its toasts.
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

// Movement rides the spring, the fade eases; the way out is shorter and has no bounce.
const cardsMotion: ToasterMotion = {
  stagger: 0.07,
  initial: {
    toast: {
      y: { value: '100%', spring: { damping: 0.72, response: 0.42 } },
      opacity: { value: 0, duration: 160 },
    },
  },
  exit: {
    toast: {
      y: { value: '100%', duration: 200, easing: 'var(--ui-ease-out)' },
      opacity: { value: 0, duration: 160 },
    },
  },
}
</script>
