<template>
  <div class="param-box">
    <span class="param-label">set:</span>
    <input
        type="text"
        v-model="element.params[0].value"
        class="param-input"
        style="width: 80px;"
        :disabled="disabled"
        @input="$emit('update')"
    />
    <span class="param-label" style="margin: 0 6px 0 10px;">=</span>
    <input
        type="text"
        v-model="element.params[1].value"
        class="param-input"
        style="min-width: 250px; color: #f7ce74;"
        placeholder="max(a, b) * sin(time) + (10 % 3)"
        :disabled="disabled"
        @input="$emit('update')"
    />
  </div>
</template>

<script setup>
defineProps({
  element: Object,
  disabled: Boolean
})
defineEmits(['update'])
</script>

<style scoped>
.param-box {
  display: flex;
  align-items: center;
}

.param-label {
  font-size: 18px;
  font-family: inherit;
}

.param-input {
  font-family: inherit;
  background: transparent;
  border: none;
  border-bottom: 4px solid #618673;
  color: white;
  padding: 2px;
  font-size: 18px;
  outline: none;
}

.param-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  border-bottom-color: #555 !important;
}
</style>