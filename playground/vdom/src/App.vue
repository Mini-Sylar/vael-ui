<template>
  <div>
    <ConfigProvider :i18n="{ t }">
      <main class="page">
        <div class="page-header">
          <div>
            <h1>{{ t('nav.title') }}</h1>
            <p class="lede">
              Each primitive rendered three ways: plain CSS, motion-v via slots, and imperatively
              (GSAP / WAAPI / motion.create).
            </p>
          </div>
          <div class="header-controls">
            <select v-model="locale" class="locale-select" aria-label="Language">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
            <ThemeToggle />
          </div>
        </div>
        <ThemeDemo />
        <section class="demo">
          <h2>Scoped theme</h2>
          <p class="note">
            A nested <code>ConfigProvider</code> re-themes only its own slot content — sharp corners
            and a custom <code>ui</code> part-class here, the app default everywhere else. Compare
            the buttons below to the rounded ones elsewhere on this page; nothing outside this box
            changed. The dialog stays scoped too, even though it <code>Teleport</code>s its actual
            markup out to <code>body</code> — Dialog reads the nearest scope from context (Vue's
            provide/inject, unaffected by Teleport) and re-applies it directly to its own teleported
            root, since plain CSS inheritance can't reach across a Teleport on its own.
          </p>
          <ConfigProvider
            :theme="{ radius: '0px', button: { ui: { root: 'sharp-scoped-button' } } }"
          >
            <div class="scoped-theme-box row">
              <Button @click="scopedDialogOpen = true">Sharp button</Button>
              <Button variant="outline">Sharp outline</Button>
            </div>
            <Dialog v-model:open="scopedDialogOpen" aria-label="Scoped dialog" title="Still scoped">
              <template #default>
                <p>Sharp corners here too, despite Teleporting to <code>body</code>.</p>
              </template>
            </Dialog>
          </ConfigProvider>
        </section>
        <BouncyAccordionDemo />
        <PasswordFieldDemo />
        <BreadcrumbDemo />
        <ComposerDemo />
        <FormDemo />
        <SpotlightMenuDemo />
        <StatusMenuDemo />
        <GooeyPopoverDemo />
        <BloomMenuDemo />
        <DrawerDemo />
        <FamilyDrawerDemo />
        <ToastDemo v-model:position="toastPosition" v-model:engine="toastEngine" />
        <DashboardDemo />
      </main>
      <TooltipHost />
      <Toaster
        :position="toastPosition"
        :motion-css="toastEngine === 'css'"
        @card-enter="onToastEnter"
        @card-leave="onToastLeave"
      />
      <DialogHost />
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { useAnimate } from 'motion-v'
import { Button, ConfigProvider, Dialog, DialogHost, Toaster, TooltipHost } from 'vael-ui'
import type { ToasterPosition } from 'vael-ui'
import ThemeToggle from './ThemeToggle.vue'
import ThemeDemo from './ThemeDemo.vue'
// Everything below is a composed pattern/prototype, not a shipped vael-ui
// component — once one graduates into packages/ui and gets a real docs
// page, its demo moves to docs/src/demos and is deleted from here, so a
// shipped component is never documented in two places at once.
import PasswordFieldDemo from './demos/PasswordFieldDemo.vue'
import BreadcrumbDemo from './demos/BreadcrumbDemo.vue'
import ComposerDemo from './demos/ComposerDemo.vue'
import FormDemo from './demos/FormDemo.vue'
import SpotlightMenuDemo from './demos/SpotlightMenuDemo.vue'
import StatusMenuDemo from './demos/StatusMenuDemo.vue'
import GooeyPopoverDemo from './demos/GooeyPopoverDemo.vue'
import BloomMenuDemo from './demos/BloomMenuDemo.vue'
import DrawerDemo from './demos/DrawerDemo.vue'
import FamilyDrawerDemo from './demos/FamilyDrawerDemo.vue'
import BouncyAccordionDemo from './demos/BouncyAccordionDemo.vue'
// Toaster itself has shipped and has its own docs examples, but this one
// stays: it's the live testbed for the GSAP/motion-v enter/leave engines
// below, feeding the app's own root Toaster, not a duplicate of the docs demo.
import ToastDemo from './demos/ToastDemo.vue'
import DashboardDemo from './demos/dashboard/DashboardDemo.vue'

const toastPosition = ref<ToasterPosition>('bottom-right')
const toastEngine = ref<'css' | 'gsap' | 'motion-v'>('gsap')
const scopedDialogOpen = shallowRef(false)
const [, animateToastMotion] = useAnimate()

/*
 * EXTREME example: replaces Toast's built-in CSS enter/exit with a GSAP
 * pop-in + cascade on stack, and a physical "flick away" on exit — via the
 * `motionCss="false"` + `@card-enter`/`@card-leave` escape hatch.
 *
 * Animates an inner wrapper created around the card's own children, not the
 * `<li>` itself: GSAP's x/y/rotate/scale claim `transform` and zero the
 * `translate` longhand as a side effect, which would freeze the card's own
 * stack offset the instant the tween started. The wrapper has no
 * Vue-managed inline style, so GSAP owns its `transform` with zero
 * conflict, while the `<li>`'s `translate` stays 100% Vue-owned.
 */
function getFlourishWrap(el: HTMLElement): HTMLElement {
  const existing = el.querySelector<HTMLElement>(':scope > .toast-flourish-wrap')
  if (existing) return existing
  const wrap = document.createElement('div')
  wrap.className = 'toast-flourish-wrap'
  wrap.style.cssText = 'display:flex;align-items:flex-start;gap:0.625rem;width:100%;'
  while (el.firstChild) wrap.appendChild(el.firstChild)
  el.appendChild(wrap)
  return wrap
}

let lastEnterAt = 0
let enterBurstIndex = 0
function nextBurstDelay(): number {
  // Cascade: toasts that entered within the same ~400ms burst (e.g. "Stack
  // several") get an increasing delay instead of all popping in at once.
  const now = performance.now()
  enterBurstIndex = now - lastEnterAt < 400 ? enterBurstIndex + 1 : 0
  lastEnterAt = now
  return enterBurstIndex * 0.07
}

function onToastEnterGsap(el: Element, done: () => void) {
  const wrap = getFlourishWrap(el as HTMLElement)
  const fromBottom = toastPosition.value.startsWith('bottom')
  gsap.fromTo(
    wrap,
    { opacity: 0, y: fromBottom ? 28 : -28, scale: 0.82, rotate: fromBottom ? 6 : -6 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      duration: 0.55,
      delay: nextBurstDelay(),
      ease: 'back.out(1.7)',
      onComplete: done,
    },
  )
}

function onToastLeaveGsap(el: Element, done: () => void) {
  const wrap = getFlourishWrap(el as HTMLElement)
  const fromBottom = toastPosition.value.startsWith('bottom')
  gsap.to(wrap, {
    opacity: 0,
    x: 70,
    y: fromBottom ? 24 : -24,
    rotate: 12,
    scale: 0.85,
    duration: 0.35,
    ease: 'power2.in',
    onComplete: done,
  })
}

// Same wrap, same cascade counter, same numbers — only useAnimate() drives
// the tween instead of gsap.to/fromTo, proving the wrapper technique itself
// isn't GSAP-specific either.
function onToastEnterMotion(el: Element, done: () => void) {
  const wrap = getFlourishWrap(el as HTMLElement)
  const fromBottom = toastPosition.value.startsWith('bottom')
  const flourish = fromBottom ? 28 : -28
  animateToastMotion(
    wrap,
    { opacity: [0, 1], y: [flourish, 0], scale: [0.82, 1], rotate: [fromBottom ? 6 : -6, 0] },
    { duration: 0.55, delay: nextBurstDelay(), ease: [0.34, 1.56, 0.64, 1] },
  ).finished.then(done)
}

function onToastLeaveMotion(el: Element, done: () => void) {
  const wrap = getFlourishWrap(el as HTMLElement)
  const fromBottom = toastPosition.value.startsWith('bottom')
  animateToastMotion(
    wrap,
    { opacity: 0, x: 70, y: fromBottom ? 24 : -24, rotate: 12, scale: 0.85 },
    { duration: 0.35, ease: [0.4, 0, 1, 1] },
  ).finished.then(done)
}

// Bound conditionally in the template (undefined in 'css' mode), not
// branched-on-every-call here — these do real DOM work (getFlourishWrap
// moves the card's actual children into a fresh wrapper element), which
// must not run at all for plain CSS toasts, not just "run and produce a
// no-op animation".
const onToastEnter = computed(() =>
  toastEngine.value === 'css'
    ? undefined
    : toastEngine.value === 'motion-v'
      ? onToastEnterMotion
      : onToastEnterGsap,
)
const onToastLeave = computed(() =>
  toastEngine.value === 'css'
    ? undefined
    : toastEngine.value === 'motion-v'
      ? onToastLeaveMotion
      : onToastLeaveGsap,
)

// The intended, common pattern: one ConfigProvider at the app root. `i18n`
// here is the app's own real vue-i18n composer — ConfigProvider accepts it
// structurally, with no `vue-i18n` dependency in the library itself.
// <Toaster /> follows the same root-provider rule.
const { t, locale } = useI18n()
</script>
