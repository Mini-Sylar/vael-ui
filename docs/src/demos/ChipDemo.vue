<template>
  <section class="demo">
    <h2>Chip</h2>
    <p class="note">
      A small reusable pill, plain and non-interactive by default. Pass <code>removable</code> for a
      trailing dismiss button; the remove click stops propagation so a Chip inside a bigger
      clickable row doesn't also trigger that row.
    </p>

    <h3>Removable, filtering a list of tags</h3>
    <div class="row">
      <Chip
        v-for="skill in skills"
        :key="skill"
        :label="skill"
        removable
        @remove="skills = skills.filter((s) => s !== skill)"
      />
      <Button
        v-if="skills.length < allSkills.length"
        size="sm"
        variant="ghost"
        @click="resetSkills"
      >
        Reset
      </Button>
    </div>

    <h3>Plain, non-removable</h3>
    <div class="row">
      <Chip label="Read only" />
      <Chip label="Draft" size="sm" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Chip } from 'vael-ui'

const allSkills = ['Vue', 'TypeScript', 'CSS', 'Accessibility']
const skills = shallowRef([...allSkills])

function resetSkills() {
  skills.value = [...allSkills]
}
</script>
