<template>
  <main style="padding: 2rem; font-family: sans-serif">
    <h1>vael-ui/nuxt playground</h1>
    <p>
      Every vael-ui component below is used with zero manual import — auto-registered by
      <code>vael-ui/nuxt</code>.
    </p>

    <section>
      <h2>Static</h2>
      <Card style="padding: 1rem; display: flex; gap: 0.5rem; align-items: center">
        <Badge data-testid="badge">3</Badge>
        <Tag variant="success" data-testid="tag">Active</Tag>
        <Button variant="primary" data-testid="static-button">Click me</Button>
      </Card>
    </section>

    <section>
      <h2>Motion on first paint</h2>
      <p>
        Server-rendered: these come in from CSS before any script, and hydration never replays them.
      </p>
      <Card
        v-for="(label, i) in ['One', 'Two', 'Three']"
        :key="label"
        v-animate="appear"
        :style="{ '--i': i, padding: '0.75rem', marginBlock: '0.5rem' }"
        :data-testid="`appear-${i}`"
      >
        {{ label }}
      </Card>
    </section>

    <section>
      <h2>Interactive (verifies hydration, not just SSR markup)</h2>
      <p>
        <Checkbox v-model="checked" data-testid="checkbox" />
        <output data-testid="checkbox-state">{{ checked }}</output>
      </p>
      <p>
        <Switch v-model="toggled" data-testid="switch" />
        <output data-testid="switch-state">{{ toggled }}</output>
      </p>
      <p>
        <Button data-testid="counter-button" @click="count++">Count: {{ count }}</Button>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
const checked = ref(false)
const toggled = ref(true)
const count = ref(0)
// A fade up with a 60ms stagger, read from each card's --i.
const appear = {
  initial: { opacity: 0, y: 12 },
  stagger: 0.06,
  duration: 400,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
}
</script>
