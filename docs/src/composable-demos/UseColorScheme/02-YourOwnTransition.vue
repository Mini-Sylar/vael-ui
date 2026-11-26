<template>
  <section class="demo">
    <h3>Extremes</h3>
    <SelectButton v-model="effect" :items="names" :allow-empty="false" size="sm" />
    <div class="row">
      <Button
        v-for="option in options"
        :key="option"
        size="sm"
        :variant="mode === option ? 'primary' : 'secondary'"
        :aria-pressed="mode === option"
        @click="
          (event: MouseEvent) => setMode(option, { from: event, motion: effects[effect]!(event) })
        "
      >
        {{ option[0]!.toUpperCase() + option.slice(1) }}
      </Button>
    </div>
    <p class="demo-status">Showing {{ resolvedMode }}.</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, SelectButton, useColorScheme } from 'vael-ui'
import type { ColorSchemeMode, ColorSchemeMotion } from 'vael-ui'

const options: ColorSchemeMode[] = ['light', 'dark', 'system']
const { mode, resolvedMode, setMode } = useColorScheme()

// A spiky star at the click, `r` px out, turned by `turn` radians.
const star = (x: number, y: number, r: number, turn: number) =>
  `polygon(${Array.from({ length: 32 }, (_, i) => {
    const angle = (i / 32) * Math.PI * 2 + turn
    const reach = i % 2 ? r * 0.45 : r
    return `${x + Math.cos(angle) * reach}px ${y + Math.sin(angle) * reach}px`
  }).join(',')})`

// One face of a cube as wide as the screen, turned by `turn` degrees.
const face = (turn: number, back = 0) =>
  `perspective(1400px) translateZ(${-50 - back}vw) rotateY(${turn}deg) translateZ(50vw)`

const effects: Record<string, (event: MouseEvent) => ColorSchemeMotion> = {
  // The screen shakes, then the new scheme explodes out of the click.
  Starburst: ({ clientX: x, clientY: y }) => {
    const far = Math.hypot(innerWidth, innerHeight) * 1.6
    return {
      exit: {
        old: {
          x: { value: [0, -14, 12, -10, 16, -8, 6, -3, 0], duration: 380, easing: 'linear' },
          y: { value: [0, 8, -7, 6, -10, 5, -4, 2, 0], duration: 380, easing: 'linear' },
        },
      },
      initial: {
        new: {
          clipPath: {
            value: [star(x, y, 0, 0), star(x, y, far * 0.35, 0.6), star(x, y, far, 1.4)],
            times: [0, 0.35, 1],
            delay: 0.3,
            duration: 900,
            easing: 'cubic-bezier(0.2, 0.9, 0.1, 1)',
          },
        },
      },
    }
  },
  // The page turns away on a cube and the new scheme turns in on the next face.
  Cube: () => ({
    duration: 1100,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    exit: {
      old: {
        transformOrigin: 'center',
        transform: [face(0), face(-45, 30), face(-90)],
        filter: ['brightness(1)', 'brightness(0.7)', 'brightness(0.3)'],
      },
    },
    initial: {
      new: {
        transformOrigin: 'center',
        transform: [face(90), face(45, 30), face(0)],
        filter: ['brightness(0.3)', 'brightness(0.7)', 'brightness(1)'],
      },
    },
  }),
  // The page spirals into the click and the new scheme bursts back out.
  'Black hole': () => {
    const bang = <T>(value: T[]) => ({
      value,
      delay: 0.7,
      duration: 900,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      times: [0, 0.4, 1],
    })
    return {
      duration: 800,
      easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
      exit: {
        old: {
          rotate: [0, -120, -540],
          scale: [1, 0.7, 0],
          clipPath: ['inset(0 round 0%)', 'inset(0 round 30%)', 'inset(0 round 50%)'],
        },
      },
      initial: {
        new: {
          rotate: bang([200, -12, 0]),
          scale: bang([0, 1.08, 1]),
          clipPath: bang(['inset(0 round 50%)', 'inset(0 round 4%)', 'inset(0 round 0%)']),
        },
      },
    }
  },
}
const names = Object.keys(effects).map((name) => ({ label: name, value: name }))
const effect = shallowRef('Starburst')
</script>

<style scoped>
.demo {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}
.row {
  display: flex;
  gap: 0.5rem;
}
</style>
