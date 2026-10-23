<template>
  <section class="demo">
    <h3>Extreme: a stretchy indicator</h3>
    <p class="note">
      Pagination's <code>move</code> hook replaces the slide. It gets the indicator and where it
      came from, and returns a WAAPI animation: the highlight stretches across the gap, squashed
      thin, then springs back to its own size with a jelly wobble from <code>springEasing</code>.
      The longer the jump, the longer the stretch. The page buttons rise in with
      <code>stagger</code>.
    </p>
    <Pagination
      v-model:page="page"
      aria-label="Pagination with a stretchy indicator"
      :total="200"
      :sibling-count="2"
      :motion="motion"
    />
    <p class="demo-status">Page {{ page }} of 20</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Pagination, springEasing } from 'vael-ui'
import type { PaginationMotion } from 'vael-ui'

const page = shallowRef(3)

// The settle: low damping, so the indicator overshoots its own size and wobbles in.
const { easing, duration } = springEasing({ damping: 0.45, response: 0.45 })

const motion: PaginationMotion = {
  initial: { button: { opacity: 0, y: 6 } },
  stagger: 0.02,
  move: ({ indicator }, { from }) => {
    const width = indicator.offsetWidth
    const reach = Math.abs(from.x)
    // Halfway there it spans both the old and the new page.
    return indicator.animate(
      [
        { transform: `translateX(${from.x}px) scaleX(${from.scaleX}) scaleY(0.82)` },
        {
          transform: `translateX(${from.x / 2}px) scaleX(${1 + reach / width}) scaleY(0.82)`,
          easing,
          offset: 0.3,
        },
        { transform: 'none' },
      ],
      { duration: duration + 150, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
    )
  },
}
</script>
