<template>
  <div class="param-box choice-box" @copy.stop>
    <span class="param-label highlight-purple">select:</span>
    <div class="custom-select-wrapper">
      <!-- Селектор всегда активен, позволяя выбирать варианты ответа в заблокированном блоке -->
      <div
          class="param-input select-trigger"
          @click.stop="active = !active"
      >
        {{ currentOption || 'Choose option...' }}
      </div>
      <div v-if="active" class="enum-popup" @click.stop>
        <div
            v-for="(opt, idx) in options"
            :key="idx"
            class="enum-option"
            :class="{ 'is-selected': parseInt(element.params[0].value) === idx }"
            @click="selectOption(idx)"
        >
          {{ opt }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  element: Object,
  disabled: Boolean
});
const emit = defineEmits(['update']);

const active = ref(false);

const options = computed(() => {
  return props.element.params[1]?.value || [];
});

const currentOption = computed(() => {
  const idx = parseInt(props.element.params[0].value, 10) || 0;
  return options.value[idx] || '';
});

const selectOption = (idx) => {
  props.element.params[0].value = String(idx);
  active.value = false;
  emit('update');
};
</script>

<style scoped>
.choice-box {
  display: flex;
  align-items: center;
  font-family: inherit;
}
.highlight-purple {
  color: #a38bf5;
  font-weight: bold;
}
.custom-select-wrapper {
  position: relative;
}
.select-trigger {
  cursor: pointer;
  border-bottom: 4px solid #a38bf5;
  color: #fff;
  padding: 2px 6px;
  font-size: 18px;
  min-width: 150px;
}
.enum-popup {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #000;
  border: 4px solid #4a4a4a;
  display: flex;
  flex-direction: column;
  z-index: 100;
  min-width: 250px;
}
.enum-option {
  font-family: inherit;
  color: #fff;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
}
.enum-option:hover {
  background: rgba(255, 255, 255, 0.1);
}
.enum-option.is-selected {
  background: #f7ce74;
  color: #000;
  font-weight: bold;
}
</style>