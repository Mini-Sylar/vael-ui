<!-- Rating with every part: five stars, three and a half filled. -->
<template>
  <div data-specimen class="specimen">
    <Rating v-model="stars" allow-half size="lg" aria-label="Rate this course" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Rating } from 'vael-ui'

const stars = shallowRef(3.5)
</script>

<style scoped>
.specimen {
  display: grid;
  justify-items: center;
  inline-size: min(18rem, 100%);
}
</style>
