<template>
  <Button data-testid="leaf-el">
    <template #default="{ el }">{{ el ? el.tagName : 'none' }}</template>
  </Button>
  <Button data-testid="leaf-div" as="div" @click="clicks++">Div</Button>
  <Button data-testid="leaf-hold" :hold="300" @click="holds++">Hold</Button>
  <span data-testid="leaf-counts">{{ clicks }}|{{ holds }}</span>
  <Field data-testid="leaf-field" label="Name" label-placement="float">
    <Input v-model="name" size="lg" />
  </Field>
  <Input data-testid="leaf-clear" v-model="name" :clearable="clearable" />
  <Button data-testid="leaf-clearable" @click="clearable = true">Clearable</Button>
  <Switch data-testid="leaf-switch" :model-value="true" label="On" />
  <Textarea v-model="notes" :auto-grow="grow" />
  <Button data-testid="leaf-grow" @click="grow = true">Grow</Button>
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { Button, Field, Input, Switch, Textarea } from 'vael-ui/vapor'

const clicks = ref(0)
const holds = ref(0)
const name = ref('Ada')
const clearable = ref(false)
const notes = ref('one\ntwo\nthree')
const grow = ref(false)
</script>
