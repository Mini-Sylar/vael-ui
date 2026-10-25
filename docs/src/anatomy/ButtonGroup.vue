<!-- ButtonGroup with its one part, the root that joins three toggle buttons. -->
<template>
  <div data-specimen class="specimen">
    <ButtonGroup v-model="range" aria-label="Range" :allow-empty="false">
      <Button variant="outline" value="day">Day</Button>
      <Button variant="outline" value="week">Week</Button>
      <Button variant="outline" value="month">Month</Button>
    </ButtonGroup>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'

const range = shallowRef('week')
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(18rem, 100%);
}
</style>
