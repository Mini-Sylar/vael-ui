<template>
  <section class="demo">
    <h2>Button</h2>

    <h3>Variants</h3>
    <div class="row">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="text">Text</Button>
      <Button variant="danger">Danger</Button>
    </div>

    <h3>Sizes</h3>
    <div class="row">
      <Button size="sm" variant="secondary">Small</Button>
      <Button size="md" variant="secondary">Medium</Button>
      <Button size="lg" variant="secondary">Large</Button>
    </div>

    <h3>Shape — pill prop, or just override <code>ui.root</code> for a one-off</h3>
    <div class="row">
      <Button pill>Pill</Button>
      <Button pill variant="outline">Pill outline</Button>
      <Button pill icon variant="secondary" aria-label="Add">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </Button>
    </div>

    <h3>Icons — #leading / #trailing slots, icon-only via the icon prop</h3>
    <div class="row">
      <Button>
        <template #leading>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </template>
        New item
      </Button>
      <Button variant="outline">
        Continue
        <template #trailing>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M3 8h10m0 0L9 4m4 4l-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </template>
      </Button>
      <Button icon size="sm" variant="secondary" aria-label="Add">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </Button>
      <Button icon variant="outline" aria-label="Settings">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="2.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </Button>
      <Button icon size="lg" variant="danger" aria-label="Delete">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <path
            d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.8 9.5h6.4L12 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
    </div>

    <h3>Disabled — dimmed, hover/press inert, not-allowed cursor</h3>
    <div class="row">
      <Button disabled>Primary</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="danger" disabled>Danger</Button>
    </div>

    <h3>Polymorphic — <code>as="a"</code> renders a real link, styled identically</h3>
    <div class="row">
      <Button as="a" href="https://vuejs.org" target="_blank" rel="noopener">Link button</Button>
      <Button as="a" variant="outline" href="https://vuejs.org" target="_blank" rel="noopener">
        Outline link
      </Button>
      <Button as="a" href="https://vuejs.org" disabled>Disabled link (click is a no-op)</Button>
    </div>

    <h3>Loading — @click returning a promise is all the wiring needed</h3>
    <div class="row">
      <Button @click="fakeSave">Overlay loader</Button>

      <Button loader="inline" variant="secondary" @click="fakeSave">
        <template #default="{ loading }">
          {{ loading ? 'Saving…' : 'Inline loader + text' }}
        </template>
      </Button>

      <Button loader="inline" variant="outline" @click="fakeSave">
        <template #leading>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M8 2v8m0 0L5 7m3 3l3-3M2.5 12.5h11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </template>
        Download
      </Button>

      <Button variant="secondary" @click="fakeSave">
        <template #loader="{ loading }">
          <AnimatePresence>
            <motion.span
              v-if="loading"
              key="dots"
              class="loader-dots"
              :initial="{ opacity: 0, scale: 0.6 }"
              :animate="{ opacity: 1, scale: 1 }"
              :exit="{ opacity: 0, scale: 0.6 }"
              :transition="{ duration: 0.16, ease: 'easeOut' }"
            >
              <motion.span
                v-for="i in 3"
                :key="i"
                class="loader-dot"
                :animate="{ opacity: [0.35, 1, 0.35] }"
                :transition="{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (i - 1) * 0.15,
                }"
              />
            </motion.span>
          </AnimatePresence>
        </template>
        motion-v loader
      </Button>

      <MotionButton
        :while-press="{ scale: 0.95 }"
        :transition="{ type: 'spring', duration: 0.25, bounce: 0 }"
        @click="presses++"
      >
        motion.create wrap{{ presses ? ` · ${presses}` : '' }}
      </MotionButton>

      <Button ref="gsapBtn" @click="gsapSave">GSAP success pop</Button>
    </div>

    <h3>
      Overlay badge — the <code>#badge</code> slot, same wrapper-owns-placement contract as Avatar
    </h3>
    <p class="note">
      <code
        >&lt;Button&gt;&lt;template #badge&gt;&lt;Badge dot variant="danger"
        /&gt;&lt;/template&gt;&lt;/Button&gt;</code
      >
      — Button owns the positioned wrapper (<code>badgePlacement</code>, default
      <code>top-end</code>); Badge stays the same context-free leaf it is everywhere else. The
      wrapper is <code>display: contents</code> whenever no badge is rendered, so it's a zero-cost
      addition to every other Button on this page.
    </p>
    <div class="row">
      <Button variant="secondary" icon aria-label="Notifications">
        <template #badge>
          <Badge dot variant="danger" />
        </template>
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <path
            d="M8 2a4 4 0 00-4 4v2.2L2.7 10.5a.7.7 0 00.5 1.2h9.6a.7.7 0 00.5-1.2L12 8.2V6a4 4 0 00-4-4zM6.5 13.5a1.6 1.6 0 003 0"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
      <Button variant="secondary" icon aria-label="Messages">
        <template #badge>
          <Badge variant="danger" :count="unread" />
        </template>
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <path
            d="M2 4.5h12v7.5H2V4.5zm0 0l6 4.5 6-4.5"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
      <Button size="sm" variant="ghost" @click="unread++">+1 unread</Button>
    </div>

    <p class="note">
      EXTREME composition: <code>block</code> (full-width) + <code>badge</code> +
      <code>loading</code> all at once — the case most likely to break the wrapper, since
      <code>block</code>'s own full-width sizing lives on the button INSIDE the wrapper, which has
      nothing to stretch against once the wrapper itself stops being <code>display: contents</code>.
      See <code>button-badge.test.ts</code> for the automated regression.
    </p>
    <div class="row">
      <Button block variant="primary" @click="fakeSave">
        <template #badge>
          <Badge variant="warning" :count="3" />
        </template>
        Sync all projects
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { gsap } from 'gsap'
import { Badge, Button } from 'vael-ui'

const unread = shallowRef(2)

// motion.create wraps externally so library never knows motion-v exists
const MotionButton = motion.create(Button, { forwardMotionProps: true })

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1400))

const gsapBtn = useTemplateRef('gsapBtn')
const presses = shallowRef(0)

// clearProps hands transform back to stylesheet so CSS :active press feedback keeps working
async function gsapSave() {
  await fakeSave()
  gsap.fromTo(
    gsapBtn.value!.el,
    { scale: 1.05 },
    { scale: 1, duration: 0.4, ease: 'back.out(3)', clearProps: 'transform' },
  )
}
</script>
