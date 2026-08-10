<template>
  <section class="demo">
    <h2>Dialog</h2>
    <p class="note">
      This dialog's × label comes from the app's real vue-i18n instance, wired once at the root in
      <code>App.vue</code>. Switch the language selector up top and every dialog on this page
      updates. That's the whole i18n/theming pattern: one <code>ConfigProvider</code>, configured
      once.
    </p>
    <p class="note">
      Dialogs stack: each instance tracks its own place in a shared layer stack, so Escape and the
      Tab focus trap only ever act on the topmost one, and the shared scroll lock stays engaged
      until every open dialog has closed.
    </p>

    <h3>Basics, CSS transition, footer slot, nested dialogs</h3>
    <div class="row">
      <Button @click="cssOpen = true">Rename project</Button>
      <Button variant="outline" @click="outerOpen = true">Nested dialogs</Button>
    </div>

    <Dialog
      v-model:open="cssOpen"
      aria-label="CSS dialog"
      title="Rename project"
      description="The new name is visible to everyone in the workspace."
    >
      <template #default>
        <p>
          Body content goes here. The header above and footer below are the built-in chrome
          (title/description props plus the <code>#footer</code> slot).
        </p>
      </template>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button @click="() => fakeTask().then(close)">Save changes</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="outerOpen" aria-label="Outer dialog" title="Outer dialog">
      <template #default>
        <p>
          Escape here closes this dialog, unless the nested one below is open, in which case Escape
          closes that one first.
        </p>
        <Button variant="secondary" @click="innerOpen = true">Open nested dialog</Button>

        <Dialog v-model:open="innerOpen" aria-label="Inner dialog" title="Inner dialog" size="sm">
          <template #default>
            <p>Topmost: this is the one Escape and Tab act on right now.</p>
          </template>
        </Dialog>
      </template>
    </Dialog>

    <h3>Contained dialog</h3>
    <p class="note">
      <code>container</code> scopes a dialog to one element instead of the viewport. The overlay
      dims only that box, the modality applies only inside it, and the rest of this page stays live
      — while the dialog below is open you can still scroll the page and press the buttons above it.
      Inside the pane, everything but the dialog is <code>inert</code>: not clickable, skipped by
      Tab, hidden from screen readers.
    </p>
    <p class="note">
      <code>scroll-target</code> is the pane's inner scroller, which is what gets locked. Keeping it
      separate from <code>container</code> means the container itself never scrolls, so the panel
      can be positioned against it with plain <code>inset: 0</code>. Escape is routed by focus, so a
      contained dialog only answers to Escape pressed inside its own container.
    </p>

    <div ref="pane" class="contained-pane">
      <header class="contained-pane__bar">
        <strong>Project files</strong>
        <Button size="sm" variant="outline" @click="containedOpen = true">Move to…</Button>
      </header>
      <div ref="paneScroll" class="contained-pane__body">
        <p v-for="n in 14" :key="n" class="contained-pane__row">
          <code>src/components/File{{ n }}.vue</code>
        </p>
      </div>
    </div>

    <Dialog
      v-model:open="containedOpen"
      :container="pane"
      :scroll-target="paneScroll"
      size="sm"
      aria-label="Contained dialog"
      title="Move 3 files"
      description="Only this pane is blocked. The page around it keeps working."
    >
      <template #default>
        <p>Try scrolling the page, or clicking “Rename project” above - both still work.</p>
        <Button variant="secondary" @click="containedNestedOpen = true">
          Open a nested contained dialog
        </Button>
      </template>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button @click="close()">Move</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:open="containedNestedOpen"
      :container="pane"
      :scroll-target="paneScroll"
      size="sm"
      aria-label="Nested contained dialog"
      title="Are you sure?"
      description="Stacks inside the same container; Escape closes this one first."
    >
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Back</Button>
      </template>
    </Dialog>

    <h3>Custom exit animations: GSAP and motion-v</h3>
    <p class="note">
      Dialog's panel Teleports to <code>&lt;body&gt;</code>, so it can't be wrapped in
      <code>AnimatePresence</code> for exit animation the way an un-Teleported component can. The
      escape hatch is the same three hooks every animated component in this library exposes:
      <code>force-mount</code> (keep the panel mounted, own it via <code>v-show</code>),
      <code>before-close(done)</code> (run your own exit, then call <code>done()</code> to actually
      unmount), and the exposed <code>panelEl</code> ref to animate. "Grow from here" is the extreme
      end: it reads the trigger button's real <code>getBoundingClientRect()</code> on open and
      morphs the panel out of that exact position and size, then shrinks back into it on close.
    </p>
    <div class="row">
      <Button @click="gsapEnter">Force-mount fade (GSAP)</Button>
      <Button ref="flipTrigger" variant="secondary" class="flip-trigger" @click="flipEnter"
        >Grow from here (GSAP)</Button
      >
      <Button
        ref="dynamicFlipMotionTrigger"
        variant="secondary"
        class="flip-trigger"
        @click="openDynamicFlipMotion"
        >Dynamic FLIP (motion-v)</Button
      >
    </div>
    <p class="note">
      "Dynamic FLIP" runs the identical shared-element math as "Grow from here," but through
      <code>openDialog()</code> instead of a template <code>&lt;Dialog ref&gt;</code>: the returned
      handle's <code>panelEl</code> stands in for the template ref, and
      <code>beforeClose</code> works exactly the same way. Nothing about a dynamic dialog is
      animation-limited compared to a static one.
    </p>

    <Dialog
      ref="gsapDialog"
      v-model:open="gsapOpen"
      force-mount
      :before-close="gsapBeforeClose"
      aria-label="GSAP dialog"
      title="Imperative exit"
      description="force-mount + beforeClose(done): GSAP animates the exposed panelEl, then done() flips the model."
    >
      <template #footer="{ close }">
        <Button @click="close()">Close with GSAP</Button>
      </template>
    </Dialog>

    <Dialog
      ref="flipDialog"
      v-model:open="flipOpen"
      force-mount
      :before-close="flipBeforeClose"
      aria-label="FLIP dialog"
      title="Shared-element FLIP (GSAP)"
      size="sm"
    >
      <template #default>
        <p>
          Watch the edges: this grew out of the button's own rect, not the viewport center. Closing
          shrinks it back into the same button.
        </p>
      </template>
      <template #footer="{ close }">
        <Button @click="close()">Shrink back</Button>
      </template>
    </Dialog>

    <h3>Layout: position, size, and long content</h3>
    <div class="row">
      <Button variant="outline" @click="longContentOpen = true">Long content</Button>
      <Button variant="outline" @click="openPositioned('top')">Top dialog</Button>
      <Button variant="outline" @click="openPositioned('bottom')">Bottom dialog</Button>
      <Button variant="outline" @click="maximizableOpen = true">Maximizable dialog</Button>
      <Button variant="outline" @click="blurredOpen = true">Blurred backdrop</Button>
    </div>
    <p class="note">
      Long content triggers <code>scroll-fade</code> automatically once the panel actually
      overflows; the shorter dialogs above never get it. <code>position</code> and
      <code>maximizable</code> are just props. "Blurred backdrop" sets
      <code>:ui="{ overlay: 'blurred-overlay' }"</code>: the overlay is a separate DOM node from the
      panel, so this is the only way to reach it, since a plain <code>class</code> on
      <code>&lt;Dialog&gt;</code> would land on the panel instead.
    </p>

    <Dialog
      v-model:open="longContentOpen"
      aria-label="Long content dialog"
      title="Terms of service"
      size="lg"
    >
      <template #default>
        <p v-for="n in 10" :key="n">
          Section {{ n }}. This paragraph exists purely to overflow the panel's
          <code>max-block-size: 85dvh</code> so <code>scroll-fade</code> has something to mask.
          Scroll and watch the top/bottom edges fade content in and out instead of clipping it hard.
        </p>
      </template>
      <template #footer="{ close }">
        <Button @click="close()">I have read all of this</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:open="positionOpen"
      :position="demoPosition"
      aria-label="Positioned dialog"
      title="Positioned dialog"
      size="sm"
    >
      <template #default>
        <p>
          Anchored to <code>{{ demoPosition }}</code
          >: enter/exit slides from that edge instead of scaling from center.
        </p>
      </template>
    </Dialog>

    <Dialog
      v-model:open="maximizableOpen"
      maximizable
      aria-label="Maximizable dialog"
      title="Maximizable dialog"
    >
      <template #default>
        <p>
          Toggle the expand icon next to close. It fills the viewport, no drag or resize, just the
          one thing that was actually asked for.
        </p>
      </template>
    </Dialog>

    <Dialog
      v-model:open="blurredOpen"
      :ui="{ overlay: 'blurred-overlay' }"
      aria-label="Blurred backdrop dialog"
      title="Blurred backdrop"
      size="sm"
    >
      <template #default>
        <p>The page behind this dialog is blurred, not just dimmed.</p>
      </template>
    </Dialog>

    <h3>Programmatic dialogs and focus control</h3>
    <p class="note">
      "Delete workspace" never touches a template at all: <code>openDialog()</code> loads a
      component straight into a real <code>&lt;Dialog&gt;</code>, rendered by the single
      <code>&lt;DialogHost /&gt;</code> mounted once in <code>App.vue</code> (same rule as
      <code>&lt;Toaster /&gt;</code>). <code>await result</code> gets back whatever the loaded
      component's own <code>dialogRef.close(value)</code> passed. It also sets
      <code>role="alertdialog"</code>, the correct ARIA role for a confirmation, announced more
      assertively than plain <code>role="dialog"</code>.
    </p>
    <p class="note">
      "Reset settings" deliberately renders Delete before Cancel in the DOM, so the library's
      default "focus the first focusable element" would land on the destructive action, then
      overrides it with <code>initialFocus</code> pointed at the Cancel button instead.
    </p>
    <p class="note">
      "Rotate API key" sets <code>closeOnEsc</code>, <code>closeOnOverlay</code>, and
      <code>showClose</code> to <code>false</code>: Escape, clicking outside, and the × are all
      disabled. The only way out is checking the acknowledgement and clicking Continue, which calls
      <code>dialogRef.close()</code> itself.
    </p>
    <div class="row">
      <Button variant="outline" @click="openDynamicConfirm">Delete workspace</Button>
      <Button variant="outline" @click="openDangerFirstConfirm">Reset settings</Button>
      <Button variant="outline" @click="openRequiredAction">Rotate API key</Button>
    </div>
    <p v-if="dynamicResult" class="note">
      <strong>{{ dynamicResult }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { useAnimate } from 'motion-v'
import { Button, Dialog, openDialog } from 'vael-ui'
import type { DialogPosition, OpenDialogHandle } from 'vael-ui'
import ConfirmDialogContent from './ConfirmDialogContent.vue'
import type { ConfirmDialogData } from './ConfirmDialogContent.vue'
import RequiredActionDialogContent from './RequiredActionDialogContent.vue'
import type { RequiredActionData } from './RequiredActionDialogContent.vue'

const cssOpen = shallowRef(false)
const outerOpen = shallowRef(false)
const innerOpen = shallowRef(false)

const pane = useTemplateRef<HTMLElement>('pane')
const paneScroll = useTemplateRef<HTMLElement>('paneScroll')
const containedOpen = shallowRef(false)
const containedNestedOpen = shallowRef(false)

const fakeTask = () => new Promise((resolve) => setTimeout(resolve, 1200))

const gsapOpen = shallowRef(false)
const gsapDialog = useTemplateRef('gsapDialog')

// A Teleport root isn't animatable, so exit motion goes through the
// imperative fallback: force-mount + beforeClose driving GSAP on the
// exposed panelEl. Enter is animated in onOpen for symmetry.
function gsapEnter() {
  gsapOpen.value = true
  requestAnimationFrame(() => {
    const panel = gsapDialog.value?.panelEl
    if (!panel) return
    gsap.fromTo(
      panel,
      { opacity: 0, scale: 0.96, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power3.out' },
    )
  })
}

function gsapBeforeClose(done: () => void) {
  const panel = gsapDialog.value?.panelEl
  if (!panel) return done()
  gsap.to(panel, { opacity: 0, scale: 0.96, duration: 0.15, ease: 'power3.out', onComplete: done })
}

// A real shared-element/FLIP entrance: the panel grows out of the button's
// exact position and size (iOS app-icon style), then shrinks back on close.
// The "from" state is computed per-open from real getBoundingClientRect()
// geometry, not a fixed keyframe.
const flipOpen = shallowRef(false)
const flipDialog = useTemplateRef('flipDialog')
const flipTrigger = useTemplateRef('flipTrigger')

// Both directions need the same delta (trigger center minus panel center,
// and the size ratio), so it's factored out to keep GSAP and motion-v in sync.
function flipDelta(triggerEl: HTMLElement | null, panel: HTMLElement | null) {
  if (!triggerEl || !panel) return null
  const t = triggerEl.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  return {
    panel,
    x: t.left + t.width / 2 - (p.left + p.width / 2),
    y: t.top + t.height / 2 - (p.top + p.height / 2),
    scaleX: t.width / p.width,
    scaleY: t.height / p.height,
  }
}

function flipEnter() {
  flipOpen.value = true
  requestAnimationFrame(() => {
    const triggerEl = (flipTrigger.value as { el?: HTMLElement } | null)?.el ?? null
    const delta = flipDelta(triggerEl, flipDialog.value?.panelEl ?? null)
    if (!delta) return
    gsap.fromTo(
      delta.panel,
      { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.5 },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
        // Without this, GSAP's inline transform/opacity stays on the panel
        // after the tween reaches identity, which corrupts the NEXT close's
        // real getBoundingClientRect() measurement.
        onComplete: () => gsap.set(delta.panel, { clearProps: 'transform,opacity' }),
      },
    )
  })
}

function flipBeforeClose(done: () => void) {
  const triggerEl = (flipTrigger.value as { el?: HTMLElement } | null)?.el ?? null
  const delta = flipDelta(triggerEl, flipDialog.value?.panelEl ?? null)
  if (!delta) return done()
  gsap.to(delta.panel, {
    x: delta.x,
    y: delta.y,
    scaleX: delta.scaleX,
    scaleY: delta.scaleY,
    opacity: 0.4,
    duration: 0.3,
    ease: 'power3.in',
    onComplete: () => {
      // The shrink transform stays on the panel permanently otherwise
      // (v-show hides it, but hidden elements keep inline styles), so the
      // NEXT open measures the leftover rect instead of the panel's true
      // size. done() runs first so the v-show:none patch lands, then a
      // frame is given before clearing (clearing first would flash it back
      // to full size for one frame).
      done()
      requestAnimationFrame(() => {
        gsap.set(delta.panel, { clearProps: 'transform,opacity' })
      })
    },
  })
}

// motion-v's imperative escape hatch for the dynamic (openDialog) FLIP demo
// below. The scope ref is unused on purpose: animate() also accepts a
// direct element reference (panelEl) instead of a selector string.
const [, animateMotion] = useAnimate()

function clearPanelOverrides(panel: HTMLElement) {
  panel.style.transform = ''
  panel.style.opacity = ''
}

const longContentOpen = shallowRef(false)

const positionOpen = shallowRef(false)
const demoPosition = shallowRef<DialogPosition>('center')
function openPositioned(position: DialogPosition) {
  demoPosition.value = position
  positionOpen.value = true
}

const maximizableOpen = shallowRef(false)
const blurredOpen = shallowRef(false)

const dynamicResult = shallowRef<string | null>(null)
async function openDynamicConfirm() {
  const { result } = openDialog<ConfirmDialogData, boolean>(ConfirmDialogContent, {
    data: { message: 'Delete this workspace? This cannot be undone.' },
    title: 'Delete workspace',
    size: 'sm',
    role: 'alertdialog',
  })
  const confirmed = await result
  dynamicResult.value = confirmed ? 'Confirmed: workspace deleted.' : 'Cancelled: nothing happened.'
}

async function openDangerFirstConfirm() {
  const handle: OpenDialogHandle<boolean> = openDialog<ConfirmDialogData, boolean>(
    ConfirmDialogContent,
    {
      data: { message: 'Reset all settings to defaults?', dangerFirst: true },
      title: 'Reset settings',
      size: 'sm',
      role: 'alertdialog',
      initialFocus: () =>
        handle.panelEl.value?.querySelector<HTMLElement>('[data-role="cancel"]') ?? undefined,
    },
  )
  const confirmed = await handle.result
  dynamicResult.value = confirmed ? 'Confirmed: settings reset.' : 'Cancelled: nothing happened.'
}

// Same FLIP math as "Grow from here" above, but through openDialog()'s
// returned handle instead of a template <Dialog ref>: proof the trick
// isn't tied to a static template dialog, and that motion-v works here too.
const dynamicFlipMotionTrigger = useTemplateRef('dynamicFlipMotionTrigger')
function openDynamicFlipMotion() {
  const triggerEl = (dynamicFlipMotionTrigger.value as { el?: HTMLElement } | null)?.el ?? null
  const { panelEl } = openDialog<ConfirmDialogData, boolean>(ConfirmDialogContent, {
    data: {
      message: 'Grew out of the button that opened it, same FLIP math as "Grow from here" above.',
    },
    title: 'Dynamic FLIP (motion-v)',
    size: 'sm',
    forceMount: true,
    async beforeClose(done) {
      const delta = flipDelta(triggerEl, panelEl.value)
      if (!delta) return done()
      const controls = animateMotion(
        delta.panel,
        { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.4 },
        { duration: 0.3, ease: [0.36, 0, 0.66, -0.03] },
      )
      await controls.finished
      done()
      requestAnimationFrame(() => clearPanelOverrides(delta.panel))
    },
  })
  watch(
    panelEl,
    async (panel) => {
      const delta = flipDelta(triggerEl, panel)
      if (!delta) return
      // A [from, to] array doesn't write `from` to the DOM synchronously:
      // Motion applies it a frame late, flashing the panel at rest before
      // snapping to the FLIP start (GSAP's fromTo() has no such gap). A
      // zero-duration jump closes that gap first, awaited, since two
      // animateMotion() calls on the same properties in one tick cancel
      // instead of queuing.
      await animateMotion(
        delta.panel,
        { x: delta.x, y: delta.y, scaleX: delta.scaleX, scaleY: delta.scaleY, opacity: 0.5 },
        { duration: 0 },
      ).finished
      const controls = animateMotion(
        delta.panel,
        { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
        { duration: 0.45, ease: [0.17, 0.84, 0.44, 1] },
      )
      await controls.finished
      clearPanelOverrides(delta.panel)
    },
    { once: true },
  )
}

function openRequiredAction() {
  openDialog<RequiredActionData, boolean>(RequiredActionDialogContent, {
    data: {
      message: 'Rotate the workspace API key? Old integrations will stop working immediately.',
    },
    title: 'Rotate API key',
    size: 'sm',
    closeOnEsc: false,
    closeOnOverlay: false,
    showClose: false,
  })
}
</script>

<style scoped>
/* FLIP demo trigger: a normal pill-shaped button's aspect ratio is far from
   the dialog panel's, making scaleX/scaleY wildly non-uniform mid-tween and
   squashing the panel's text. Boxier proportions keep the squash subtle. */
.flip-trigger {
  min-inline-size: 9rem;
  /* block-size, not padding-block: .ui-button--md sets an explicit
     block-size as a hard constraint, so padding alone can't grow past it. */
  block-size: 3.75rem;
}

/* `position: relative` is required. */
.contained-pane {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border, #e4e4e7);
  border-radius: 0.75rem;
  max-inline-size: 34rem;
}

.contained-pane__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-block-end: 1px solid var(--ui-border, #e4e4e7);
}

/* The scroller is inside the container, not the container itself. */
.contained-pane__body {
  overflow-y: auto;
  max-block-size: 13rem;
  padding: 0.5rem 1rem;
}

.contained-pane__row {
  margin: 0;
  padding-block: 0.35rem;
}
</style>

<!-- Unscoped: the overlay teleports to <body> with Dialog, out of scoped reach. -->
<style>
.blurred-overlay {
  backdrop-filter: blur(8px);
}
</style>
