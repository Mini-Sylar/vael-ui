<template>
  <Checkbox
    label="Agree"
    data-testid="vapor-focus-checkbox"
    @focus="log('checkbox-focus')"
    @blur="log('checkbox-blur')"
  />
  <Switch
    data-testid="vapor-focus-switch"
    @focus="log('switch-focus')"
    @blur="log('switch-blur')"
  />
  <RadioGroup
    data-testid="vapor-focus-radios"
    @focus="log('radios-focus')"
    @blur="log('radios-blur')"
  >
    <Radio value="a" label="A" />
    <Radio value="b" label="B" />
  </RadioGroup>
  <Select
    :items="items"
    data-testid="vapor-focus-select"
    @focus="log('select-focus')"
    @blur="log('select-blur')"
  />
  <Slider
    data-testid="vapor-focus-slider"
    @focus="log('slider-focus')"
    @blur="log('slider-blur')"
  />
  <button data-testid="vapor-focus-end">end</button>
</template>

<script setup lang="ts" vapor>
import { Checkbox, Radio, RadioGroup, Select, Slider, Switch } from 'vael-ui/vapor'

const props = defineProps<{ events: string[] }>()
const items = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
]
function log(name: string) {
  props.events.push(name)
}
</script>
