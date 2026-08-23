<template>
  <section class="demo">
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
