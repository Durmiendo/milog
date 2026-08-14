<template>
  <div class="toolbars">
    <div class="element-wrapper">
      <LogicElement index="" title="Процессор" color="#8c6bed" :control="false">
        <div class="params-row" @copy.stop>
          <button class="btn-reset btn-primary" @click="$emit('run')">run</button>
          <button class="btn-reset btn-primary" :class="{ 'btn-auto-active': isAutoRunning }" @click="$emit('toggleAuto')">
            {{ isAutoRunning ? 'stop' : 'auto' }}
          </button>
          <button class="btn-reset" @click="$emit('resetRun')">reset</button>
          <button class="btn-reset" @click="$emit('showVars')">vars</button>
          <button class="btn-reset" @click="$emit('showMocks')">mocks</button>
          <button class="btn-reset" @click="$emit('goTo')">go to</button>
          <button v-if="allowCustomBlocks" class="btn-reset" @click="$emit('addBlock')">add block</button>
          <button class="btn-reset btn-quiet" @click="expanded = !expanded">
            {{ expanded ? 'скрыть настройки' : 'настройки' }}
          </button>
        </div>

        <div v-if="expanded" class="params-row settings-row" @copy.stop>
          <div class="param-box">
            <span class="param-label">ips:</span>
            <input type="number" v-model.number="settings.ips" :disabled="isCodeLocked" class="param-input"/>
          </div>
          <div class="param-box">
            <span class="param-label">max_lines:</span>
            <input type="number" v-model.number="settings.max_lines" :disabled="isCodeLocked" class="param-input"/>
          </div>
          <div class="param-box">
            <span class="param-label">max_jumpes:</span>
            <input type="number" v-model.number="settings.max_jumpes" :disabled="isCodeLocked" class="param-input"/>
          </div>
          <button class="btn-reset btn-quiet" @click="$emit('reset')">сброс настроек</button>
          <template v-if="!isCodeLocked">
            <button class="btn-reset btn-quiet" @click="$emit('copy')">to buffer</button>
            <button class="btn-reset btn-quiet" @click="$emit('paste')">from buffer</button>
            <button class="btn-reset btn-quiet" @click="$emit('clear')">clear</button>
          </template>
        </div>
      </LogicElement>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import LogicElement from '../blocks/LogicElement.vue'

defineProps({
  settings: Object,
  isAutoRunning: Boolean,
  isCodeLocked: Boolean,
  allowCustomBlocks: Boolean
})
defineEmits(['reset', 'resetRun', 'copy', 'paste', 'clear', 'addBlock', 'run', 'toggleAuto', 'showVars', 'showMocks', 'goTo'])

const expanded = ref(false)
</script>

<style scoped>
.params-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.settings-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 2px solid rgba(140, 107, 237, 0.4);
}

.param-box {
  display: flex;
  align-items: center;
}

.param-label {
  font-family: inherit;
  font-size: 15px;
  color: #b9a9f2;
}

.param-input {
  font-family: inherit;
  background: transparent;
  border: none;
  border-bottom: 2px solid #8c6bed;
  color: white;
  padding: 0 2px;
  font-size: 15px;
  outline: none;
  width: 64px;
}

.param-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  border-bottom-color: #555 !important;
}

.btn-reset {
  font-family: inherit;
  background-color: transparent;
  color: #b9a9f2;
  border: 2px solid #8c6bed;
  padding: 2px 10px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-reset:hover {
  background-color: #8c6bed;
  color: #fff;
}

.btn-primary {
  color: #fff;
}

.btn-quiet {
  color: #8a8a95;
  border-color: #4a4a5a;
  font-size: 14px;
}

.btn-quiet:hover {
  background-color: #4a4a5a;
}

.btn-auto-active {
  background-color: #8c6bed;
  color: #fff;
}

.element-wrapper {
  margin-bottom: 10px;
  position: relative;
}
</style>
