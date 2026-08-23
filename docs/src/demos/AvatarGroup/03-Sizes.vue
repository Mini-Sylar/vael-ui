<template>
  <section class="demo">
    <h3>Sizes</h3>
    <div class="row row--stack">
      <AvatarGroup size="sm">
        <Avatar v-for="person in team.slice(0, 3)" :key="person" :name="person" size="sm" />
      </AvatarGroup>
      <AvatarGroup size="lg" :overflow-count="2">
        <Avatar v-for="person in team.slice(0, 3)" :key="person" :name="person" size="lg" />
      </AvatarGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Avatar, AvatarGroup } from 'vael-ui'

const team = [
  'Ada Lovelace',
  'Grace Hopper',
  'Katherine Johnson',
  'Margaret Hamilton',
  'Radia Perlman',
  'Barbara Liskov',
]
</script>

<style scoped>
.row--stack {
  align-items: center;
}
</style>
