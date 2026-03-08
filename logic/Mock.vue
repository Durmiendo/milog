<template>
  <div class="mock-canvas">

    <div class="top-controls flex-between">
      <h2 class="main-title">Environment Variables</h2>
      <button class="btn-action btn-danger" @click="$emit('close')">
        Close Mocks (Esc)
      </button>
    </div>

    <div class="element-wrapper creation-panel">
      <LogicElement
          :index="''"
          :title="'Create Mocks'"
          :color="'#8c6bed'"
          :type="{ command: 'Create Mocks' }"
          :control="false"
      >
        <div class="params-row flex-between">
          <div class="param-box">
            <span class="param-label highlight-yellow">mock:</span>
            <select v-model="selectedType" class="param-input param-select">
              <option v-if="availableTypes.length === 0" disabled value="">no mocks</option>
              <option v-for="type in availableTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
          <div class="param-box">
            <button class="btn-action" :disabled="!selectedType" @click="addNewBlock">add</button>
          </div>
        </div>
      </LogicElement>
    </div>

    <div class="blocks-container">
      <div v-if="!world?.blocks || Object.keys(world.blocks).length === 0" class="empty-state">
        <span class="param-label empty-text">No mocks created yet.</span>
      </div>

      <template v-for="(list, type) in (world?.blocks || {})" :key="'group-' + type">
        <div class="element-wrapper" v-for="(block, index) in list" :key="`${type}-${index}`">

          <LogicElement
              :index="`#${block.id}`"
              :title="block.name"
              :color="getBlockColor(type)"
              :type="{ command: block.name }"
              :control="true"
              @remove="removeBlock(type, index)"
          >
            <div class="mock-section init-section">
              <div class="section-header flex-between">
                <span class="section-title highlight-yellow">Init Variables</span>
                <div class="action-group">
                  <button class="btn-action btn-small btn-outline" @click="resetBlockMock(block, type)" title="Reset to default">reset</button>
                  <button class="btn-action btn-small btn-yellow" @click="reinitBlock(block)">apply</button>
                </div>
              </div>

              <div class="fields-grid" v-if="block.mock && Object.keys(block.mock).length > 0">
                <div class="field-chip" v-for="(val, key) in block.mock" :key="key">
                  <span class="field-key">{{ key }}:</span>
                  <input type="text" v-model="block.mock[key]" class="param-input chip-input" placeholder="0" />
                </div>
              </div>
              <div v-else class="empty-text param-label" style="margin-top: 10px;">no init variables</div>
            </div>

            <div v-if="type === 'logic_display'" class="mock-section display-section">
              <div class="section-header">
                <span class="section-title highlight-blue">Display Output</span>
              </div>
              <div class="canvas-wrapper">
                <canvas
                    :ref="(el) => bindDisplayCanvas(el, block)"
                    class="logic-canvas"
                    :width="block.mock.size || 176"
                    :height="block.mock.size || 176"
                ></canvas>
              </div>
            </div>

            <div v-if="getMethods(block).length > 0" class="mock-section methods-section">
              <div class="section-header">
                <span class="section-title highlight-purple">Methods</span>
              </div>

              <div v-for="methodName in getMethods(block)" :key="methodName" class="method-row">
                <div class="method-signature">
                  <span class="method-name">{{ methodName }}</span>

                  <div class="method-args-wrapper" v-if="getMethodArgs(block[methodName]).length > 0">
                    <span class="brackets">(</span>
                    <div class="method-args">
                      <div class="arg-item" v-for="arg in getMethodArgs(block[methodName])" :key="arg">
                        <span class="arg-label">{{ arg }}:</span>
                        <input type="text"
                               v-model="getTestState(type, index, methodName).args[arg]"
                               class="param-input arg-input"
                               :placeholder="arg === 'commands' ? '[JSON]' : '0'"
                               :class="{'wide-input': arg === 'commands'}"
                        />
                      </div>
                    </div>
                    <span class="brackets">)</span>
                  </div>
                  <div v-else class="method-args-wrapper">
                    <span class="brackets">()</span>
                  </div>
                </div>

                <div class="method-actions">
                  <button class="btn-action btn-purple" @click="callMethod(block, type, index, methodName)">call</button>
                  <div class="result-box" v-if="getTestState(type, index, methodName).result !== null">
                    <span class="result-value" :class="{'is-error': String(getTestState(type, index, methodName).result).includes('Error')}">
                      {{ getTestState(type, index, methodName).result }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="block.data && Array.isArray(block.data)" class="mock-section data-viewer-container">
              <div class="section-header flex-between">
                <span class="section-title highlight-green">Memory Bank ({{ block.data.length }})</span>
                <button class="btn-action btn-green btn-small" @click="toggleMemory(type, index)">
                  {{ memoryExpanded[`${type}-${index}`] ? 'collapse ▲' : 'expand ▼' }}
                </button>
              </div>
              <div class="data-grid" :class="{ 'is-expanded': memoryExpanded[`${type}-${index}`] }">
                <div v-for="(val, i) in block.data" :key="i" class="data-cell" :class="{ 'is-active': val !== 0 }" :title="val">
                  <span class="data-idx">{{ String(i).padStart(2, '0') }}</span>
                  <span class="data-val">{{ formatValue(val) }}</span>
                </div>
              </div>
            </div>

          </LogicElement>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watchEffect, onMounted, onUnmounted } from 'vue';
import LogicElement from './LogicElement.vue';

const props = defineProps({
  world: { type: Object, default: null }
});

const emit = defineEmits(['close']);


const canvasRefs = new Map();
const lastDrawnTimes = new Map();
let animationFrameId = null;

const bindDisplayCanvas = (el, block) => {
  if (el) {
    canvasRefs.set(block.id, el);
    updateDisplayView(block);
  } else {
    canvasRefs.delete(block.id);
    lastDrawnTimes.delete(block.id);
  }
};

const updateDisplayView = (block) => {
  const destCanvas = canvasRefs.get(block.id);
  const sourceCanvas = block._canvas;

  if (destCanvas && sourceCanvas) {
    const currentUpdate = block.lastUpdate || 0;
    if (lastDrawnTimes.get(block.id) === currentUpdate && currentUpdate !== 0) {
      return;
    }
    lastDrawnTimes.set(block.id, currentUpdate);

    const ctx = destCanvas.getContext('2d');
    if (destCanvas.width !== sourceCanvas.width) destCanvas.width = sourceCanvas.width;
    if (destCanvas.height !== sourceCanvas.height) destCanvas.height = sourceCanvas.height;

    ctx.clearRect(0, 0, destCanvas.width, destCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);
  }
};

const renderLoop = () => {
  const displays = props.world?.blocks['logic_display'] ||[];
  displays.forEach(block => {
    updateDisplayView(block);
  });
  animationFrameId = requestAnimationFrame(renderLoop);
};


const handleGlobalKeydown = (e) => {
  if (e.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
  renderLoop();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  canvasRefs.clear();
  lastDrawnTimes.clear();
});

const availableTypes = computed(() => {
  return (props.world && props.world.impl) ? Object.keys(props.world.impl) :[];
});

const selectedType = ref('');

watchEffect(() => {
  if (availableTypes.value.length > 0 && !selectedType.value) {
    selectedType.value = availableTypes.value[0];
  }
});

const addNewBlock = () => {
  if (selectedType.value && props.world) {
    props.world.addBlock(selectedType.value);
  }
};

const removeBlock = (type, index) => {
  if (confirm(`Delete ${type}?`)) {
    if (props.world && props.world.blocks[type]) {
      props.world.removeBlock(type, index);
    }
  }
};

const getBlockColor = (type) => {
  if (type === 'membank') return '#8c6bed';
  if (type === 'processor') return '#d47c7c';
  if (type === 'logic_display') return '#7cccd4';
  return '#8c6bed';
};

const getMethods = (block) => {
  if (!block) return[];
  return Object.keys(block).filter(key =>
      typeof block[key] === 'function' && key !== 'init' && !key.startsWith('_')
  );
};

const getMethodArgs = (fn) => {
  if (!fn) return [];
  const str = fn.toString();
  const cleanStr = str.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const match = cleanStr.match(/^[^(]*\(\s*([^)]*)\)/);
  if (!match) return [];
  return match[1].split(',')
      .map(s => s.trim().split('=')[0].trim().replace(/[{}]/g, ''))
      .filter(Boolean);
};

const resetBlockMock = (block, type) => {
  if (props.world && props.world.impl[type]) {
    const defaults = props.world.impl[type]().mock;
    for (const key in defaults) {
      block.mock[key] = defaults[key];
    }
  }
};

const reinitBlock = (block) => {
  if (typeof block.init === 'function') {
    block.init(block.mock);
    if (block.type === 'logic_display') updateDisplayView(block);
  }
};

const methodStates = reactive({});

const getTestState = (type, index, methodName) => {
  const key = `${type}-${index}-${methodName}`;
  if (!methodStates[key]) {
    methodStates[key] = { args: {}, result: null };
  }
  return methodStates[key];
};

const callMethod = (block, type, index, methodName) => {
  const state = getTestState(type, index, methodName);
  const argNames = getMethodArgs(block[methodName]);

  const callArgs = argNames.map(name => {
    let val = state.args[name];
    if (name === 'commands') return val;
    return isNaN(Number(val)) || val === '' ? val : Number(val);
  });

  try {
    const res = block[methodName](...callArgs);
    state.result = res !== undefined ? res : 'void';
  } catch (err) {
    state.result = `Err: ${err.message}`;
  }
};

const memoryExpanded = reactive({});

const toggleMemory = (type, index) => {
  const key = `${type}-${index}`;
  memoryExpanded[key] = !memoryExpanded[key];
};

const formatValue = (val) => {
  if (typeof val !== 'number') return val;
  const str = String(val);
  if (str.length <= 6) return str;
  if (Math.abs(val) > 999999 || (Math.abs(val) < 0.001 && val !== 0)) {
    return val.toExponential(2);
  }
  return Number(val.toFixed(3));
};
</script>

<style scoped>
.mock-canvas {
  padding: 24px;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.top-controls {
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 4px solid #333;
}
.main-title {
  color: #fff;
  margin: 0;
  font-family: inherit;
  font-size: 24px;
}

.creation-panel {
  margin-bottom: 24px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.action-group {
  display: flex;
  gap: 12px;
}
.params-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 8px;
}
.param-box {
  display: flex;
  align-items: center;
}

.param-label {
  font-size: 18px;
  color: white;
  font-family: inherit;
  margin-right: 8px;
}
.section-title {
  font-size: 18px;
  font-weight: bold;
}
.highlight-yellow { color: #f7ce74; }
.highlight-purple { color: #a38bf5; }
.highlight-green { color: #b8d8be; }
.highlight-blue { color: #7cccd4; }

.param-input {
  background: transparent;
  border: none;
  border-bottom: 4px solid #8c6bed;
  color: white;
  padding: 4px 6px;
  font-size: 18px;
  font-family: inherit;
  outline: none;
  margin-left: 8px;
  text-align: center;
}
.chip-input { width: 80px; }
.wide-input { width: 150px; text-align: left; }
.param-select {
  cursor: pointer;
  border-bottom-color: #f7ce74;
  text-align: left;
}
.param-select option {
  background-color: #000;
  color: #fff;
}

.btn-action {
  background-color: transparent;
  color: #8c6bed;
  border: 4px solid #8c6bed;
  padding: 6px 16px;
  font-size: 18px;
  font-family: inherit;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-small {
  padding: 4px 10px;
  font-size: 16px;
  border-width: 3px;
}
.btn-action:hover:not(:disabled) {
  background-color: #8c6bed;
  color: #1a1a1a;
  border-color: #8c6bed;
}
.btn-action:active:not(:disabled) {
  transform: translateY(2px);
}
.btn-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-yellow { color: #f7ce74; border-color: #f7ce74; }
.btn-yellow:hover:not(:disabled) { background-color: #f7ce74; border-color: #f7ce74; }

.btn-purple { color: #a38bf5; border-color: #a38bf5; }
.btn-purple:hover:not(:disabled) { background-color: #a38bf5; border-color: #a38bf5; }

.btn-green { color: #b8d8be; border-color: #b8d8be; }
.btn-green:hover:not(:disabled) { background-color: #b8d8be; border-color: #b8d8be; }

.btn-danger { color: #f77474; border-color: #f77474; }
.btn-danger:hover:not(:disabled) { background-color: #f77474; border-color: #f77474; }

.btn-outline { color: #ccc; border-color: #555; }
.btn-outline:hover:not(:disabled) { background-color: #555; color: #fff; border-color: #555; }

.mock-section {
  padding: 16px;
  margin-top: 12px;
  margin-bottom: 16px;
  border-left: 6px solid transparent;
  background: rgba(255, 255, 255, 0.03);
}
.init-section { border-left-color: #f7ce74; }
.methods-section { border-left-color: #a38bf5; background: rgba(0, 0, 0, 0.2); }
.data-viewer-container { border-left-color: #b8d8be; background: rgba(0, 0, 0, 0.4); }

.display-section {
  border-left-color: #7cccd4;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.section-header { margin-bottom: 16px; }

.canvas-wrapper {
  margin-top: 10px;
  border: 4px solid #333;
  display: inline-block;
  background: #000;
  line-height: 0;
}
.logic-canvas {
  image-rendering: pixelated;
  width: 176px;
  height: 176px;
}

.fields-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.field-chip {
  display: flex;
  align-items: center;
  background: #000;
  border: 4px solid #333;
  padding: 6px 10px;
}
.field-key {
  color: #ccc;
  font-size: 18px;
}
.empty-state { text-align: center; padding: 40px; }
.empty-text { opacity: 0.5; font-size: 18px; }

.method-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: #000;
  border: 4px solid #333;
}
.method-row:hover { border-color: #a38bf5; }
.method-signature { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.method-name { color: #a38bf5; font-size: 20px; font-weight: bold; margin-right: 8px; }
.method-args-wrapper { display: flex; align-items: center; }
.brackets { color: #666; font-size: 20px; font-weight: bold; }
.method-args { display: flex; gap: 12px; margin: 0 8px; }
.arg-item { display: flex; align-items: center; }
.arg-label { color: #aaa; font-size: 18px; margin-right: 4px; }
.arg-input { width: 60px; text-align: center; border-bottom-color: #a38bf5; }

.method-actions { display: flex; align-items: center; gap: 16px; }
.result-box {
  background: #111;
  border: 4px solid #444;
  padding: 6px 12px;
  min-width: 60px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-value { color: #b8d8be; font-size: 18px; font-weight: bold; }
.result-value.is-error { color: #f77474; }

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 4px;
  max-height: 140px;
  overflow-y: auto;
  padding-right: 8px;
  transition: max-height 0.3s ease-in-out;
}
.data-grid.is-expanded {
  max-height: 500px;
}
.data-cell {
  background: #000;
  border: 2px solid #333;
  padding: 4px;
  text-align: center;
  min-width: 0;
  overflow: hidden;
  cursor: help;
}
.data-cell.is-active {
  border-color: #f7ce74;
  background: #111;
}
.data-idx {
  display: block;
  color: #777;
  font-size: 11px;
  margin-bottom: 2px;
  font-weight: bold;
}
.data-val {
  color: #ddd;
  font-size: 15px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.data-cell.is-active .data-val {
  color: #f7ce74;
  font-weight: bold;
}

.data-grid::-webkit-scrollbar { width: 10px; }
.data-grid::-webkit-scrollbar-track { background: #000; border-left: 2px solid #333;}
.data-grid::-webkit-scrollbar-thumb { background: #555; border: 2px solid #000; }
.data-grid::-webkit-scrollbar-thumb:hover { background: #777; }
</style>