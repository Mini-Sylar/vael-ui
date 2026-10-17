<template>
  <section class="demo">
    <h3>Extreme: a stretchy indicator (GSAP)</h3>
    <p class="note">
      <code>:motion-css="false"</code> stops the indicator sliding, and the exposed
      <code>indicatorEl</code> and <code>labelsEl</code> are what you drive. Here the edge facing
      the new page runs ahead and the other follows, so the highlight stretches across the gap and
      then catches up with a jelly wobble. The longer the jump, the longer the stretch, and the page
      numbers keep their color in step with it.
    </p>
    <Pagination
      ref="pagination"
      v-model:page="page"
      aria-label="Pagination with a stretchy indicator"
      :total="200"
      :sibling-count="2"
      :motion-css="false"
    />
    <p class="demo-status">Page {{ page }} of 20</p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Pagination } from 'vael-ui'

const page = shallowRef(3)
const pagination = useTemplateRef('pagination')

interface Edges {
  left: number
  right: number
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let current: Edges | null = null
let stretch: gsap.core.Timeline | null = null
let observer: MutationObserver | null = null

function read(indicator: HTMLElement): Edges {
  const left = parseFloat(indicator.style.insetInlineStart) || 0
  return { left, right: left + (parseFloat(indicator.style.inlineSize) || 0) }
}

// The page numbers in the contrast color, clipped to the indicator, so the color travels with it.
function clip(labels: HTMLElement, { left, right }: Edges) {
  labels.style.clipPath = `inset(0 calc(100% - ${right}px) 0 ${left}px round calc(var(--ui-radius) - 4px))`
}

function stretchTo(to: Edges) {
  const indicator = pagination.value?.indicatorEl
  const labels = pagination.value?.labelsEl
  if (
    !indicator ||
    !labels ||
    !current ||
    reduce() ||
    (current.left === to.left && current.right === to.right)
  ) {
    current = to
    return
  }
  stretch?.kill()
  const edges = { ...current }
  const forward = to.left >= edges.left
  const leading = forward ? 'right' : 'left'
  const trailing = forward ? 'left' : 'right'
  const paint = () => {
    indicator.style.insetInlineStart = `${edges.left}px`
    indicator.style.inlineSize = `${Math.max(edges.right - edges.left, 12)}px`
    clip(labels, edges)
    current = { ...edges }
    // The writes above aren't the change we're watching for.
    observer?.takeRecords()
  }
  stretch = gsap.timeline({ onUpdate: paint, onComplete: () => (current = to) })
  // Jelly: it squashes as it sets off, then springs back to full height.
  stretch.fromTo(
    indicator,
    { scaleY: 0.82 },
    { scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', clearProps: 'transform' },
    0,
  )
  // The leading edge overshoots its page and settles back; the trailing one wobbles in behind it.
  stretch.to(edges, { [leading]: to[leading], duration: 0.5, ease: 'back.out(2.4)' }, 0)
  stretch.to(edges, { [trailing]: to[trailing], duration: 0.7, ease: 'elastic.out(1, 0.55)' }, 0.07)
  paint()
}

// Vue puts the indicator's new position in its inline style; take over from there, not from it.
onMounted(() => {
  const indicator = pagination.value?.indicatorEl
  if (!indicator) return
  current = read(indicator)
  observer = new MutationObserver(() => stretchTo(read(indicator)))
  observer.observe(indicator, { attributes: true, attributeFilter: ['style'] })
})
onBeforeUnmount(() => {
  observer?.disconnect()
  stretch?.kill()
})
</script>
