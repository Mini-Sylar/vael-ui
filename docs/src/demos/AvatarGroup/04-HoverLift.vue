<template>
  <section class="demo">
    <h3><code>hoverLift</code></h3>
    <p class="note">Off by default. Lifts an avatar above its neighbors on hover.</p>
    <div class="row">
      <AvatarGroup hover-lift>
        <Avatar v-for="person in team.slice(0, 4)" :key="person" :name="person" />
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
