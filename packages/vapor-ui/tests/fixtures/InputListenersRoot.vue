<template>
  <Input
    v-model="text"
    data-testid="vapor-listeners-input"
    @input="log('input')"
    @focus="log('focus')"
    @blur="log('blur')"
  />
  <Textarea v-model="note" data-testid="vapor-listeners-textarea" @input="log('textarea-input')" />
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { Input, Textarea } from 'vael-ui/vapor'

const props = defineProps<{ events: string[] }>()
const text = ref('')
const note = ref('')
function log(name: string) {
  props.events.push(name)
}
</script>
