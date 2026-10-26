<template>
  <Breadcrumb :items="crumbs" :motion="{ initial: { item: { opacity: 0 } }, stagger: 0.02 }" />
  <AvatarGroup :motion="{ initial: { avatar: { opacity: 0 } } }">
    <Avatar v-for="name in people" :key="name" :name="name" />
  </AvatarGroup>
</template>

<script setup lang="ts" vapor>
// List components given their own motion: their items come and go through a TransitionGroup.
import { shallowRef } from 'vue'
import { Avatar, AvatarGroup, Breadcrumb } from 'vael-ui/vapor'

const crumbs = shallowRef([{ label: 'Reports' }, { label: 'Week' }])
const people = shallowRef(['Ama Mensah', 'Kofi Boateng'])
defineExpose({ crumbs, people })
</script>
