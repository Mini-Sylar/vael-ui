<template>
  <section class="demo">
    <h2>Family drawer (extreme)</h2>
    <p class="note">
      The animations.dev family drawer, built on <code>&lt;Dialog&gt;</code> and
      <code>&lt;Button&gt;</code> only — every animated property lives on the exposed
      <code>panelEl</code> itself, nothing is delegated to inner wrappers. The sheet slides in from
      fully below the viewport edge on a bouncy spring — measured distance, no fade — and slides
      back out (force-mount + <code>beforeClose(done)</code>, so Escape and backdrop-click get the
      same slide exit), and switching views springs the panel's own <code>block-size</code> between
      measured heights while the content crossfades with a blur+drift mask. The <code>ui</code> prop
      reaches every layer this needs: the overlay (blur ramp), the panel (radius + neutralizing the
      built-in maximize transition so the spring owns <code>block-size</code>), and the body
      (padding removed so each view carries its own).
    </p>

    <Button @click="openDrawer">Start family plan</Button>

    <Dialog
      ref="drawer"
      v-model:open="open"
      force-mount
      :before-close="beforeClose"
      position="bottom"
      :show-close="false"
      :scroll-fade="false"
      :initial-focus="focusPanel"
      :ui="dialogUi"
      aria-label="Family plan"
    >
      <template #default="{ close }">
        <div class="family-viewport">
          <div
            v-for="view in views"
            :key="view.step"
            class="family-view"
            :class="{
              'family-view--entering': view.entering,
              'family-view--leaving': view.leaving,
            }"
          >
            <div class="family-view-header">
              <Button
                v-if="view.step === 'confirm'"
                size="sm"
                icon
                variant="ghost"
                aria-label="Back"
                @click="goToStep('plan')"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                  <path
                    d="M10 3 5 8l5 5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Button>
              <span v-else class="family-spacer" />
              <span class="family-title">{{ stepTitles[view.step] }}</span>
              <Button size="sm" icon variant="ghost" aria-label="Close" @click="close()">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </Button>
            </div>

            <template v-if="view.step === 'plan'">
              <p class="family-lede">Pick the plan that fits your household.</p>
              <div class="family-plan-list">
                <Button
                  v-for="plan in plans"
                  :key="plan.id"
                  variant="outline"
                  class="family-plan-btn"
                  @click="selectPlan(plan)"
                >
                  <span>{{ plan.name }}</span>
                  <span class="family-plan-price">{{ plan.price }}</span>
                </Button>
              </div>
            </template>

            <template v-else-if="view.step === 'confirm' && selectedPlan">
              <p class="family-lede">
                <strong>{{ selectedPlan.name }}</strong> — {{ selectedPlan.price }}
              </p>
              <p class="family-desc">{{ selectedPlan.desc }}</p>
              <div class="family-actions">
                <Button variant="ghost" @click="goToStep('plan')">Back</Button>
                <Button @click="goToStep('success')">Confirm plan</Button>
              </div>
            </template>

            <template v-else-if="view.step === 'success'">
              <div class="family-success">
                <span class="family-success-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path
                      d="M5 13l4.5 4.5L19 8"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <p class="family-lede">You're all set — {{ selectedPlan?.name }} is active.</p>
              </div>
              <div class="family-actions">
                <Button variant="ghost" @click="restart">Choose another plan</Button>
                <Button @click="close()">Done</Button>
              </div>
            </template>
          </div>
        </div>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { animate } from 'motion-v'
import { Button, Dialog } from 'vael-ui'
import type { DialogProps } from 'vael-ui'

interface SpringConfig {
  type: 'spring'
  visualDuration: number
  bounce: number
}
// Bubbly = a tight, fast bounce: same ~5% overshoot as a longer spring, but
// peaking right after arrival instead of drifting in 200ms late.
const PANEL_SPRING: SpringConfig = { type: 'spring', visualDuration: 0.3, bounce: 0.3 }
const HEIGHT_SPRING: SpringConfig = { type: 'spring', visualDuration: 0.35, bounce: 0.12 }
// iOS drawer curve — fast launch, soft landing over the full slide distance.
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]

type Step = 'plan' | 'confirm' | 'success'
interface Plan {
  id: string
  name: string
  price: string
  desc: string
}
interface ViewEntry {
  step: Step
  entering: boolean
  leaving: boolean
}

const plans: Plan[] = [
  { id: 'individual', name: 'Individual', price: '$9.99/mo', desc: 'For one person, one library.' },
  { id: 'family', name: 'Family', price: '$16.99/mo', desc: 'Up to 6 people, shared everything.' },
  { id: 'business', name: 'Business', price: '$29.99/mo', desc: 'Unlimited seats, admin console.' },
]

const stepTitles: Record<Step, string> = {
  plan: 'Choose a plan',
  confirm: 'Confirm',
  success: 'All set',
}

const open = shallowRef(false)
const currentStep = shallowRef<Step>('plan')
const selectedPlan = shallowRef<Plan | null>(null)
const views = shallowRef<ViewEntry[]>([{ step: 'plan', entering: false, leaving: false }])
const overlayVisible = shallowRef(false)
const dialogUi = computed<DialogProps['ui']>(() => ({
  overlay: overlayVisible.value ? 'family-overlay family-overlay--visible' : 'family-overlay',
  panel: 'family-panel',
  body: 'family-body',
}))

const drawer = useTemplateRef('drawer')

// A sheet arriving on a mouse click shouldn't open with a focus ring on its
// × button — land focus on the panel itself (tabindex=-1, outline: none);
// Tab still reaches the controls.
const focusPanel = () => drawer.value?.panelEl

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const nextFrame = () => new Promise(requestAnimationFrame)

let leaveTimer: ReturnType<typeof setTimeout> | undefined
// Guards the async tail below against a second goToStep() firing mid-await
// (rapid Back/Next clicks) — without it, an in-flight call's post-await
// writes can stomp a newer call's `views` array, or its leaveTimer can
// filter out a step a newer call just entered.
let transitionToken = 0
let heightSpring: ReturnType<typeof animate> | undefined

async function goToStep(next: Step) {
  if (next === currentStep.value) return
  const token = ++transitionToken
  const prev = currentStep.value
  const panel = drawer.value?.panelEl
  heightSpring?.stop()
  const startHeight = panel?.getBoundingClientRect().height ?? 0
  if (panel) panel.style.blockSize = `${startHeight}px`
  currentStep.value = next
  clearTimeout(leaveTimer)
  views.value = [
    { step: prev, entering: false, leaving: true },
    { step: next, entering: true, leaving: false },
  ]
  await nextTick()
  if (token !== transitionToken) return
  if (panel) {
    // Auto height can't be sprung — release the pin, measure the target,
    // re-pin and animate between real numbers. All synchronous, so nothing
    // paints mid-measurement.
    panel.style.blockSize = ''
    const targetHeight = panel.getBoundingClientRect().height
    if (reducedMotion() || targetHeight === startHeight) {
      panel.style.blockSize = ''
    } else {
      panel.style.blockSize = `${startHeight}px`
      const controls = animate(startHeight, targetHeight, {
        ...HEIGHT_SPRING,
        onUpdate: (v: number) => {
          panel.style.blockSize = `${v}px`
        },
      })
      heightSpring = controls
      controls.finished.then(() => {
        if (heightSpring === controls) panel.style.blockSize = ''
      })
    }
  }
  await nextFrame()
  await nextFrame()
  if (token !== transitionToken) return
  views.value = views.value.map((v) => (v.step === next ? { ...v, entering: false } : v))
  leaveTimer = setTimeout(() => {
    if (token !== transitionToken) return
    views.value = views.value.filter((v) => v.step === next)
  }, 260)
}

function selectPlan(plan: Plan) {
  selectedPlan.value = plan
  goToStep('confirm')
}

function restart() {
  selectedPlan.value = null
  goToStep('plan')
}

let progress = 0
let panelSpring: ReturnType<typeof animate> | undefined
// Real slide, not a nudge: the full distance from the panel's resting top to
// the viewport's bottom edge, measured per open/close. No opacity — a sheet
// arriving from off-screen has nothing to fade.
let slideDistance = 0

function renderPanel(panel: HTMLElement) {
  panel.style.transform = `translateY(${(1 - progress) * slideDistance}px)`
}

// onSettle only fires if this animation is still the active one — a stopped,
// superseded one must never call a stale done() after a reversal.
function animatePanelTo(
  target: number,
  options: SpringConfig | { duration: number; ease: typeof EASE_DRAWER },
  onSettle?: () => void,
) {
  const panel = drawer.value?.panelEl
  if (!panel) {
    onSettle?.()
    return
  }
  panelSpring?.stop()
  const controls = animate(progress, target, {
    ...options,
    onUpdate: (v: number) => {
      progress = v
      renderPanel(panel)
    },
  })
  panelSpring = controls
  if (onSettle) {
    controls.finished.then(() => {
      if (panelSpring === controls) onSettle()
    })
  }
}

async function openDrawer() {
  const dialog = drawer.value
  if (dialog?.isClosing) {
    dialog.cancelClose()
    overlayVisible.value = true
    animatePanelTo(1, PANEL_SPRING)
    return
  }
  if (open.value) return
  currentStep.value = 'plan'
  selectedPlan.value = null
  views.value = [{ step: 'plan', entering: false, leaving: false }]
  const panel = dialog?.panelEl
  progress = reducedMotion() ? 1 : 0
  if (panel) {
    panel.style.blockSize = ''
    // Real geometry isn't measurable while v-show-hidden — park it safely
    // off-screen, measure after the DOM patch (pre-paint), then re-render
    // from the exact distance.
    if (!reducedMotion()) panel.style.transform = 'translateY(100vh)'
  }
  open.value = true
  await nextTick()
  if (panel) {
    panel.style.transform = ''
    slideDistance = window.innerHeight - panel.getBoundingClientRect().top
    renderPanel(panel)
  }
  if (!reducedMotion()) animatePanelTo(1, PANEL_SPRING)
  // The overlay fades via CSS class, so its start state must paint once
  // before the class flips — only it waits; the spring is already running.
  await nextFrame()
  await nextFrame()
  if (open.value) overlayVisible.value = true
}

function beforeClose(done: () => void) {
  overlayVisible.value = false
  const panel = drawer.value?.panelEl
  if (!panel || reducedMotion()) {
    done()
    return
  }
  heightSpring?.stop()
  panel.style.blockSize = ''
  // Height morphs may have moved the resting top since open — re-derive the
  // slide distance from the untransformed top, then remap progress so the
  // panel's current visual position is unchanged (matters when Escape lands
  // mid-entrance).
  const currentY = (1 - progress) * slideDistance
  slideDistance = window.innerHeight - (panel.getBoundingClientRect().top - currentY)
  progress = 1 - currentY / slideDistance
  animatePanelTo(0, { duration: 0.3, ease: EASE_DRAWER }, () => {
    panel.style.transform = ''
    done()
  })
}
</script>

<style scoped>
.family-viewport {
  position: relative;
}

.family-view {
  padding: 1rem 1.25rem 1.25rem;
  transition:
    opacity 240ms var(--ui-ease-out),
    transform 240ms var(--ui-ease-out),
    filter 240ms var(--ui-ease-out);
}

.family-view--entering {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(4px);
}

.family-view--leaving {
  position: absolute;
  inset-inline: 0;
  top: 0;
  opacity: 0;
  transform: translateY(-8px);
  filter: blur(4px);
  transition-duration: 160ms;
  pointer-events: none;
}

.family-view-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.75rem;
}

.family-spacer {
  inline-size: 1.75rem;
  block-size: 1.75rem;
}

.family-title {
  flex: 1;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
}

.family-lede {
  margin: 0 0 0.75rem;
  font-size: 0.9375rem;
}

.family-desc {
  margin: 0 0 1rem;
  color: var(--page-text-faint);
  font-size: 0.875rem;
}

.family-plan-list {
  display: grid;
  gap: 0.5rem;
}

.family-plan-btn {
  inline-size: 100%;
}

.family-plan-btn :deep(.ui-button-content) {
  flex: 1;
  justify-content: space-between;
}

.family-plan-price {
  color: var(--page-text-faint);
  font-weight: 400;
}

.family-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.family-success {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding-block: 0.5rem 1rem;
  text-align: center;
}

.family-success-icon {
  display: grid;
  place-items: center;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ui-primary) 15%, transparent);
  color: var(--ui-primary);
}

@media (prefers-reduced-motion: reduce) {
  .family-view {
    transition: opacity 120ms ease;
  }
  .family-view--entering,
  .family-view--leaving {
    transform: none;
    filter: none;
  }
}
</style>

<!-- Unscoped on purpose: Dialog teleports these nodes to <body>, where no
  scoped ancestor exists — ui.overlay/ui.panel/ui.body land as plain class
  names on library-rendered elements. -->
<style>
.family-overlay {
  background: rgb(0 0 0 / 0.05);
  /* Constant filter, animated opacity: transitioning backdrop-filter itself
     re-blurs the whole backdrop every frame of the fade. */
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  opacity: 0;
  transition: opacity 200ms var(--ui-ease-out);
}
.family-overlay--visible {
  opacity: 1;
}
.family-panel {
  border-radius: 1.5rem;
  inline-size: min(24rem, 100%);
  margin-block-end: 1rem;
  /* The demo's spring writes block-size per frame; the library's built-in
     maximize transition would smear every write. */
  transition: none;
}
.family-body {
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  .family-overlay {
    transition: opacity 120ms ease;
  }
}
</style>
