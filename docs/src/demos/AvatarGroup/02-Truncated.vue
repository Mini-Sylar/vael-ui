<template>
  <section class="demo">
    <h3>Truncated, <code>overflowCount</code></h3>
    <div class="row">
      <AvatarGroup :overflow-count="team.length - 4">
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
