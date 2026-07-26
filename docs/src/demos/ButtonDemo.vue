<template>
  <section class="demo">
    <h2>Button</h2>

    <h3>Variants, sizes, and states</h3>
    <div class="row">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="text">Text</Button>
      <Button variant="danger">Danger</Button>
    </div>
    <div class="row">
      <Button size="sm" variant="secondary">Small</Button>
      <Button size="md" variant="secondary">Medium</Button>
      <Button size="lg" variant="secondary">Large</Button>
    </div>
    <div class="row">
      <Button disabled>Primary</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="danger" disabled>Danger</Button>
    </div>

    <h3>Icon buttons: leading/trailing slots, and icon-only via the <code>icon</code> prop</h3>
    <p class="note">
      An icon-only button always needs an explicit <code>aria-label</code>, since there's no text
      content for assistive tech to read.
    </p>
    <div class="row">
      <Button>
        <template #leading>
          <PhPlus weight="bold" />
        </template>
        New task
      </Button>
      <Button variant="outline">
        Continue
        <template #trailing>
          <PhArrowRight weight="bold" />
        </template>
      </Button>
      <Button icon variant="secondary" aria-label="Settings">
        <PhGear weight="bold" />
      </Button>
      <Button icon variant="danger" aria-label="Delete task">
        <PhTrash weight="bold" />
      </Button>
    </div>

    <h3>Loading state</h3>
    <p class="note">
      <code>@click</code> forwards straight to the button's own promise handling, so returning a
      promise is all the wiring a loading state needs. <code>loader="inline"</code> keeps the label
      visible and puts the spinner next to it instead of covering the button.
    </p>
    <div class="row">
      <Button @click="fakeSave">Save changes</Button>
      <Button loader="inline" variant="secondary" @click="fakeSave">
        <template #default="{ loading }">
          {{ loading ? 'Saving…' : 'Save as draft' }}
        </template>
      </Button>
    </div>

    <h3>Custom loading feedback (GSAP)</h3>
    <p class="note">
      Button owns none of this animation, it only exposes the underlying element through
      <code>defineExpose</code>. This example runs a GSAP tween on that ref after the click promise
      resolves, then hands the transform back to the stylesheet with <code>clearProps</code> so the
      button's normal CSS press feedback keeps working afterward.
    </p>
    <div class="row">
      <Button ref="gsapBtn" @click="gsapSave">Publish</Button>
    </div>

    <h3>Notification badge: the <code>#badge</code> slot</h3>
    <p class="note">
      Button owns the positioned wrapper (<code>badgePlacement</code>, default
      <code>top-end</code>); <code>Badge</code> stays the same context-free component it is
      everywhere else. The wrapper only exists when a badge is actually rendered, so it costs
      nothing on every other Button in this file.
    </p>
    <div class="row">
      <Button variant="secondary" icon aria-label="Notifications">
        <template #badge>
          <Badge dot variant="danger" />
        </template>
        <PhBell weight="bold" />
      </Button>
      <Button variant="secondary" icon aria-label="Messages">
        <template #badge>
          <Badge variant="danger" :count="unread" />
        </template>
        <PhEnvelopeSimple weight="bold" />
      </Button>
      <Button size="sm" variant="ghost" @click="unread++">+1 unread</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Badge, Button } from 'vael-ui'
import {
  PhArrowRight,
  PhBell,
  PhEnvelopeSimple,
  PhGear,
  PhPlus,
  PhTrash,
} from '@phosphor-icons/vue'

const unread = shallowRef(2)

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1400))

const gsapBtn = useTemplateRef('gsapBtn')

async function gsapSave() {
  await fakeSave()
  gsap.fromTo(
    gsapBtn.value!.el,
    { scale: 1.05 },
    { scale: 1, duration: 0.4, ease: 'back.out(3)', clearProps: 'transform' },
  )
}
</script>
