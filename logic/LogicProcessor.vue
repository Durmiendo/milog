<template>
  <div
      ref="containerRef"
      class="logic-canvas"
      :class="{ 'is-dragging': isDragging, 'is-arrow-dragging': arrowDrag.isDragging }"
      style="position: relative; width: 100%; padding-right: 250px;"
  >
    <div ref="contentSource" v-if="!items.length" style="display: none;"><slot /></div>

    <svg v-if="connectionPaths.length > 0" class="connections-layer" :style="{ height: containerHeight + 'px' }">
      <path
          v-for="(path, i) in connectionPaths"
          :key="'path-' + i"
          :d="path.d"
          fill="none"
          :stroke="activePathIds.has(i) || path.isDragging ? '#6335f8' : 'rgba(255,255,255,0.4)'"
          :stroke-width="activePathIds.has(i) || path.isDragging ? 6 : 4"
          stroke-linejoin="round"
          class="jump-line"
      />
      <g v-for="(path, i) in connectionPaths" :key="'handle-' + i">
        <circle
            :cx="path.endX"
            :cy="path.endY"
            r="16"
            fill="transparent"
            style="pointer-events: auto; cursor: grab;"
            @pointerdown.stop.prevent="startArrowDrag($event, path)"
        />
        <polygon
            :points="`${path.endX-8},${path.endY} ${path.endX+18},${path.endY-12} ${path.endX+18},${path.endY+12}`"
            :fill="activePathIds.has(i) || path.isDragging ? '#6335f8' : 'rgba(255,255,255,0.8)'"
            style="pointer-events: none;"
        />
      </g>
    </svg>

    <ClientOnly>
      <div class="element-wrapper">
        <LogicElement
            :index="''"
            :title="'Settings'"
            :color="'#8c6bed'"
            :control="false"
        >
          <div class="params-row" @copy.stop>
            <div class="param-box">
              <span class="param-label">ips:</span>
              <input type="number" v-model.number="settings.ips" class="param-input" style="border-bottom-color: #8c6bed" />
            </div>
            <div class="param-box">
              <span class="param-label">max_lines:</span>
              <input type="number" v-model.number="settings.max_lines" class="param-input" style="border-bottom-color: #8c6bed" />
            </div>
            <div class="param-box">
              <span class="param-label">max_jumpes:</span>
              <input type="number" v-model.number="settings.max_jumpes" class="param-input" style="border-bottom-color: #8c6bed" />
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="resetSettings">reset</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="copySelectedToClipboard">to buffer</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="pasteFromClipboard()">from buffer</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="clearAll">clear</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="showMocks = true">add block</button>
            </div>
          </div>
        </LogicElement>
      </div>

      <div class="element-wrapper">
        <LogicElement
            :index="''"
            :title="'Control'"
            :color="'#8c6bed'"
            :control="false"
        >
          <div class="params-row" @copy.stop>
            <div class="param-box">
              <button class="btn-reset" @click="next(false)">run</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" :class="{ 'btn-auto-active': isAutoRunning }" @click="toggleAuto">
                {{ isAutoRunning ? 'stop' : 'auto' }}
              </button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="showVars = true">vars</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="showMocks = true">mocks</button>
            </div>
            <div class="param-box">
              <button class="btn-reset" @click="goToCurrent">go to</button>
            </div>
          </div>
        </LogicElement>

        <div v-if="items.length > 0" class="insert-zone" @click.stop="openAddMenu(0)">
          <div class="insert-line"></div>
          <button class="insert-btn">+</button>
        </div>
      </div>

      <draggable
          v-model="items"
          handle=".header"
          item-key="id"
          :ghost-class="'ghost-item'"
          :animation="0"
          :setData="onSetData"
          @start="onDragStart"
          @end="onDragEnd"
          @change="onListChange"
      >
        <template #item="{ element, index }">
          <div
              :ref="el => setItemRef(el, element.id)"
              :data-item-id="element.id"
              class="element-wrapper"
              @mouseenter="hoveredIndex = index"
              @mouseleave="hoveredIndex = null"
              @click="toggleSelection($event, element)"
              :style="{ zIndex: activePopup?.startsWith(element.id) ? 50 : (activeExecutingIndex === index ? 40 : (hoveredIndex === index ? 30 : 2)) }"
          >
            <div class="element-toolbar" v-if="activeExecutingIndex === index">
              <button class="btn-next" @click.stop="next(true)">run</button>
              <button
                  @click.stop="toggleAuto"
                  :class="{ 'btn-auto-active': isAutoRunning }"
              >
                {{ isAutoRunning ? 'stop' : 'auto' }}
              </button>
              <button @click.stop="showVars = true">vars</button>
            </div>

            <LogicElement
                :type="element"
                :index="displayIndices[index]"
                :title="element.command"
                :color="element.category?.color || '#888'"
                @remove="removeItem(element.id)"
                @copy="copyItem(index)"
                @add="openAddMenu(index + 1)"
                :class="{
                'is-active': hoveredIndex === index || connectedIndices.has(index) || element.id === arrowDrag.hoveredItemId,
                'is-drop-target': element.id === arrowDrag.hoveredItemId,
                'is-executing': activeExecutingIndex === index,
                'is-selected-block': selectedIds.has(element.id),
                'is-label': element.command === 'label'
              }"
            >
              <div class="params-row" @copy.stop>

                <template v-if="element.command === 'math'">
                  <div class="param-box">
                    <span class="param-label">set:</span>
                    <input
                        type="text"
                        v-model="element.params[0].value"
                        class="param-input"
                        :style="{ width: '80px', borderBottomColor: element.category?.color || '#e66565' }"
                        @input="updateLines"
                    />
                    <span class="param-label" style="margin-left: 10px; margin-right: 6px;">=</span>
                    <input
                        type="text"
                        v-model="element.params[1].value"
                        class="param-input"
                        :style="{ minWidth: '250px', fontWeight: 'bold', color: '#f7ce74', borderBottomColor: element.category?.color || '#e66565' }"
                        placeholder="(a ^ 2 * 2 - 10) * 100"
                        @input="updateLines"
                    />
                  </div>

                  <div v-if="flatCodeInfo.generatedMap.get(element.id)?.length > 0" class="sub-blocks-container">
                    <div
                        v-for="(genBlock, gIdx) in flatCodeInfo.generatedMap.get(element.id)"
                        :key="gIdx"
                        class="sub-block"
                        :class="{'is-sub-executing': activeExecutingIndex === index && activeSubIndex === gIdx}"
                    >
                      <span class="sub-cmd">{{ genBlock.command }}</span>
                      <span v-for="(gp, pIdx) in genBlock.params" :key="pIdx" class="sub-param">
                        {{ gp.value }}
                      </span>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div v-if="element.command === 'jump'" class="param-box">
                    <span class="param-label">dest:</span>
                    <input
                        type="text"
                        v-model="element.jumpDest"
                        class="param-input jump-dest-input"
                        @input="onJumpDestChange(element)"
                    />
                  </div>

                  <div v-for="(p, pIdx) in element.params" :key="pIdx" class="param-box">
                    <span class="param-label">{{ p.label }}:</span>

                    <div v-if="p.type === 'enum'" class="custom-select-wrapper">
                      <div
                          class="param-input select-trigger"
                          :style="{ borderBottomColor: element.category?.color || '#888' }"
                          @click.stop="togglePopup(`${element.id}-${p.label}`)"
                      >
                        {{ p.value }}
                      </div>
                      <div v-if="activePopup === `${element.id}-${p.label}`" class="enum-popup" @click.stop>
                        <div
                            v-for="opt in p.options"
                            :key="opt"
                            class="enum-option"
                            :class="{ 'is-selected': p.value === opt }"
                            @click="selectOption(element, p, opt)"
                        >
                          {{ opt }}
                        </div>
                      </div>
                    </div>

                    <input
                        v-else-if="p.type === 'number'"
                        type="text"
                        step="any"
                        v-model.number="p.value"
                        class="param-input"
                        :style="{ borderBottomColor: element.category?.color || '#888' }"
                        @input="updateLines"
                    />

                    <input
                        v-else
                        type="text"
                        v-model="p.value"
                        class="param-input"
                        :style="{ borderBottomColor: element.category?.color || '#888' }"
                        @input="updateLines"
                    />
                  </div>
                </template>

              </div>
            </LogicElement>
            <div class="insert-zone" @click.stop="openAddMenu(index + 1)">
              <div class="insert-line"></div>
              <button class="insert-btn">+</button>
            </div>
          </div>
        </template>
      </draggable>
    </ClientOnly>

    <Teleport to="body">
      <div v-if="showVars" class="vars-fullscreen-overlay">
        <Vars :asm="asm" @close="showVars = false" />
      </div>

      <div v-if="showMocks" class="vars-fullscreen-overlay" style="overflow-y: auto;" @click.self="showMocks = false">
        <Mock :world="world" @close="showMocks = false" />
      </div>

      <div v-if="showAddMenu" class="vars-fullscreen-overlay" @click.self="showAddMenu = false">
        <Add @select="handleAddCommand" @close="showAddMenu = false" />
      </div>

      <div ref="multiDragImageRef" class="multi-drag-image-container">
        <div class="multi-drag-card">
          Перемещение {{ selectedIds.size }} блоков...
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { defineAsyncComponent, triggerRef, ref, shallowRef, computed, onMounted, nextTick, onUnmounted, watch, reactive } from 'vue'
const draggable = defineAsyncComponent(() => import('vuedraggable'))
import LogicElement from './LogicElement.vue'
import { Asm } from './asm.js';
import Vars from './Vars.vue';
import Add from './Add.vue';
import { compileMath } from './compiler.js';
import { Parser } from "./parser.js";
import Mock from "./Mock.vue";

const showAddMenu = ref(false);
const showMocks = ref(false);
const insertIndex = ref(-1);

const asm = shallowRef(new Asm());
const world = reactive(asm.value.world);

const containerRef = ref(null);
const items = ref([]);
const itemRefs = new Map();
const connectionPaths = shallowRef([]);
const containerHeight = ref(0);
const contentSource = ref(null);
const hoveredIndex = ref(null);
const isDragging = ref(false);
const activePopup = ref(null);
const showVars = ref(false);
const isAutoRunning = ref(false);
let autoTimer = null;

let rafId = null;

const selectedIds = ref(new Set());
let lastSelectedId = null;
const primaryDragId = ref(null);

let isMultiDrag = false;
let selectedItemsOrderOnDragStart =[];
let justDropped = false;

const multiDragImageRef = ref(null);

const settings = reactive({
  ips: 5,
  max_lines: 1000,
  max_jumpes: 500
});

const flatCodeInfo = computed(() => {
  const flat =[];
  const itemToFlatMap = new Map();
  const generatedMap = new Map();
  let flatIndex = 0;

  items.value.forEach((item) => {
    if (item.command === 'math') {
      const target = item.params[0].value || 'result';
      const expr = item.params[1].value || '';
      const generated = compileMath(target, expr);

      generatedMap.set(item.id, generated);

      const startIndex = flatIndex;
      if (generated.length === 0) {
        flat.push({
          command: 'set',
          params: [{ value: 'null' }, { value: 'null' }],
          id: `${item.id}_sub_0`,
          _parentId: item.id,
          _isFirst: true,
          _subIndex: 0
        });
        flatIndex++;
      } else {
        generated.forEach((genBlock, idx) => {
          flat.push({
            ...genBlock,
            id: `${item.id}_sub_${idx}`,
            _parentId: item.id,
            _isFirst: idx === 0,
            _subIndex: idx
          });
          flatIndex++;
        });
      }
      itemToFlatMap.set(item.id, { start: startIndex, end: flatIndex - 1, count: generated.length || 1 });
    } else {
      flat.push({ ...item, _parentId: item.id, _isFirst: true, _subIndex: 0 });
      itemToFlatMap.set(item.id, { start: flatIndex, end: flatIndex, count: 1 });
      flatIndex++;
    }
  });

  return { flat, itemToFlatMap, generatedMap };
});

watch(() => flatCodeInfo.value.flat, (newFlatCode) => {
  asm.value.compile(newFlatCode);
  triggerRef(asm);
}, { deep: true });

const activeExecutingIndex = computed(() => {
  if (!flatCodeInfo.value.flat || flatCodeInfo.value.flat.length === 0) return -1;

  let currFlatIndex = asm.value.current;
  if (currFlatIndex === undefined || currFlatIndex === null || currFlatIndex < 0) currFlatIndex = 0;

  if (currFlatIndex >= flatCodeInfo.value.flat.length) currFlatIndex = 0;

  const flatBlock = flatCodeInfo.value.flat[currFlatIndex];
  if (flatBlock && flatBlock._parentId) {
    return items.value.findIndex(i => i.id === flatBlock._parentId);
  }
  return -1;
});

const displayIndices = computed(() => {
  const indices =[];
  const { itemToFlatMap } = flatCodeInfo.value;

  items.value.forEach((item) => {
    if (item.command === 'label') {
      indices.push('');
      return;
    }
    const mapping = itemToFlatMap.get(item.id);
    if (mapping && mapping.count > 1) {
      indices.push(`${mapping.start}-${mapping.end}`);
    } else if (mapping) {
      indices.push(mapping.start);
    } else {
      indices.push('?');
    }
  });
  return indices;
});

const activeSubIndex = computed(() => {
  if (!flatCodeInfo.value.flat || flatCodeInfo.value.flat.length === 0) return -1;
  let curr = asm.value.current || 0;
  if (curr >= flatCodeInfo.value.flat.length) curr = 0;

  const flatBlock = flatCodeInfo.value.flat[curr];
  if (!flatBlock || !flatBlock._parentId) return -1;

  return flatBlock._subIndex !== undefined ? flatBlock._subIndex : -1;
});

const onParamInput = (element, param) => {
  if (element.command === 'label') {
    items.value.forEach(it => {
      if (it.command === 'jump') {
        if (it._targetId === element.id) {
          it.jumpDest = param.value;
        } else if (String(it.jumpDest).trim() === param.value && !it._targetId) {
          it._targetId = element.id;
        }
      }
    });
  }
  updateLines();
};

const toggleSelection = (e, item) => {
  if (justDropped) return;
  if (['INPUT', 'BUTTON'].includes(e.target.tagName)) return;

  if (e.ctrlKey || e.metaKey) {
    if (selectedIds.value.has(item.id)) selectedIds.value.delete(item.id);
    else selectedIds.value.add(item.id);
    lastSelectedId = item.id;
  } else if (e.shiftKey && lastSelectedId) {
    const startIdx = items.value.findIndex(i => i.id === lastSelectedId);
    const endIdx = items.value.findIndex(i => i.id === item.id);
    if (startIdx !== -1 && endIdx !== -1) {
      const min = Math.min(startIdx, endIdx);
      const max = Math.max(startIdx, endIdx);
      for (let i = min; i <= max; i++) {
        selectedIds.value.add(items.value[i].id);
      }
    }
  } else {
    selectedIds.value.clear();
    selectedIds.value.add(item.id);
    lastSelectedId = item.id;
  }
};

const deselectAll = () => {
  selectedIds.value.clear();
  lastSelectedId = null;
};

const copySelectedToClipboard = async () => {
  const itemsToCopy = selectedIds.value.size > 0
      ? items.value.filter(item => selectedIds.value.has(item.id))
      : items.value;

  if (itemsToCopy.length === 0) return;

  const textToCopy = itemsToCopy.map(b => {
    if (b.command === 'jump') return `jump ${b.jumpDest} ${b.params.map(p => p.value).join(' ')}`;
    if (b.command === 'label') return `${b.params[0].value}:`;

    if (b.command === 'math') {
      const generated = flatCodeInfo.value.generatedMap.get(b.id);
      if (generated && generated.length > 0) {
        return generated.map(gen => `${gen.command} ${gen.params.map(p => p.value).join(' ')}`).join('\n');
      }
      return 'set null null';
    }

    return `${b.command} ${b.params.map(p => p.value).join(' ')}`;
  }).join('\n');

  try {
    await navigator.clipboard.writeText(textToCopy);
  } catch (err) {
    console.error(err);
  }
};

const pasteFromClipboard = async (targetIndex = -1) => {
  try {
    clearAll();
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return;

    const parser = new Parser(text);
    parser.maxInstructions = settings.max_lines;
    parser.maxJumps = settings.max_jumpes;
    const newItems = parser.parse();

    if (!newItems || newItems.length === 0) return;

    let insertPos = items.value.length;
    if (targetIndex !== -1) {
      insertPos = targetIndex;
    } else if (selectedIds.value.size > 0) {
      let maxIdx = -1;
      items.value.forEach((item, idx) => {
        if (selectedIds.value.has(item.id) && idx > maxIdx) maxIdx = idx;
      });
      insertPos = maxIdx + 1;
    }

    items.value.splice(insertPos, 0, ...newItems);

    selectedIds.value.clear();
    newItems.forEach(i => selectedIds.value.add(i.id));

    nextTick(() => {
      onListChange();
    });
  } catch (err) {
    console.error(err);
  }
};

const clearAll = () => {
  if (confirm('Вы уверены, что хотите очистить весь холст?')) {
    items.value =[];
    selectedIds.value.clear();
    nextTick(onListChange);

    updateLines();
  }
};

const handleGlobalKeydown = (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      copySelectedToClipboard();
    }
    if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      pasteFromClipboard();
    }
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      items.value.forEach(i => selectedIds.value.add(i.id));
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedIds.value.size > 0) {
      e.preventDefault();
      items.value = items.value.filter(i => !selectedIds.value.has(i.id));
      selectedIds.value.clear();
      nextTick(onListChange);
    }
  } else if (e.key === 'Escape') {
    deselectAll();
    closePopup();
  }
};

const openAddMenu = (index) => {
  insertIndex.value = index;
  showAddMenu.value = true;
};

const handleAddCommand = (commandName) => {
  const newItem = createNewElement(commandName,[]);
  items.value.splice(insertIndex.value, 0, newItem);
  showAddMenu.value = false;
  nextTick(onListChange);
};

const goToCurrent = () => {
  const currentIndex = activeExecutingIndex.value;
  const currentItem = items.value[currentIndex];
  if (currentItem) {
    const el = itemRefs.get(currentItem.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
};

const testMaxIps = async () => {
  const testCount = 1000;
  const startTime = performance.now();
  for (let i = 0; i < testCount; i++) {
    asm.value.next();
  }
  const endTime = performance.now();
  const timeTakenMs = endTime - startTime;
  const maxIps = Math.floor((testCount / timeTakenMs) * 1000);
  console.log(`${timeTakenMs.toFixed(2)}`);
  console.log(`${maxIps}`);
};

window.test = testMaxIps;

const runAuto = () => {
  if (!isAutoRunning.value) return;

  const targetIps = Math.max(0.01, settings.ips);

  if (targetIps <= 60) {
    asm.value.next();
    triggerRef(asm);
    autoTimer = setTimeout(runAuto, 1000 / targetIps);
  } else {
    const opsPerFrame = Math.ceil(targetIps / 60);

    for (let i = 0; i < opsPerFrame; i++) {
      asm.value.next();
    }

    triggerRef(asm);

    if (isAutoRunning.value) {
      rafId = requestAnimationFrame(runAuto);
    }
  }
};

const toggleAuto = () => {
  isAutoRunning.value = !isAutoRunning.value;
  if (isAutoRunning.value) {
    runAuto();
  } else {
    clearTimeout(autoTimer);
    cancelAnimationFrame(rafId);
  }
};

watch(() => settings.ips, (newIps) => {
  if (isAutoRunning.value) {
    clearTimeout(autoTimer);
    const safeIps = Math.max(0.01, newIps);
    autoTimer = setTimeout(runAuto, 1000 / safeIps);
  }
});

const createNewElement = (cmd = 'set', args =[]) => {
  if (cmd === 'math') {
    return {
      id: Math.random().toString(36).substr(2, 9),
      command: 'math',
      category: { color: '#7859a8' },
      params:[
        { label: 'target', type: 'text', value: args[0] !== undefined ? args[0] : 'result' },
        { label: 'expr', type: 'text', value: args[1] !== undefined ? args[1] : 'a + b * 10' }
      ]
    };
  }
  const p = new Parser("");
  return p.createItemObject(cmd, args);
};

const resetSettings = () => {
  settings.ips = 0.3;
  settings.max_lines = 1000;
  settings.max_jumpes = 500;
};

const next = async (shouldScroll = false) => {
  const oldIndex = activeExecutingIndex.value;
  const oldItem = items.value[oldIndex];
  const oldEl = oldItem ? itemRefs.get(oldItem.id) : null;

  asm.value.next();
  triggerRef(asm);
  await nextTick();

  if (!shouldScroll) return;

  const newIndex = activeExecutingIndex.value;
  const newItem = items.value[newIndex];
  const newEl = newItem ? itemRefs.get(newItem.id) : null;

  if (oldEl && newEl && oldIndex !== newIndex) {
    const oldVisualTop = oldEl.offsetTop;
    const newVisualTop = newEl.offsetTop;
    window.scrollBy({ top: newVisualTop - oldVisualTop, behavior: 'auto' });
  }
}

const arrowDrag = ref({
  isDragging: false,
  sourceIds:[],
  x: 0,
  y: 0,
  hoveredItemId: null
});

let blockRectsCache =[];

const setItemRef = (el, id) => {
  if (el) itemRefs.set(id, el);
  else itemRefs.delete(id);
}

const togglePopup = (id) => activePopup.value = activePopup.value === id ? null : id;
const closePopup = () => activePopup.value = null;

const selectOption = (element, param, opt) => {
  param.value = opt;
  updateLines();
  closePopup();
}

const activePathIds = computed(() => {
  const activeSet = new Set();
  if (hoveredIndex.value === null) return activeSet;
  connectionPaths.value.forEach((path, i) => {
    if (path.target === hoveredIndex.value || path.sources.includes(hoveredIndex.value)) {
      activeSet.add(i);
    }
  });
  return activeSet;
});

const connectedIndices = computed(() => {
  const indices = new Set();
  if (hoveredIndex.value === null) return indices;
  connectionPaths.value.forEach(p => {
    if (p.target === hoveredIndex.value) p.sources.forEach(s => indices.add(s));
    else if (p.sources.includes(hoveredIndex.value)) indices.add(p.target);
  });
  return indices;
});

const startArrowDrag = (e, path) => {
  arrowDrag.value.isDragging = true;
  arrowDrag.value.sourceIds = path.sourceIds;

  const rect = containerRef.value.getBoundingClientRect();
  arrowDrag.value.x = e.clientX - rect.left;
  arrowDrag.value.y = e.clientY - rect.top;

  blockRectsCache = Array.from(itemRefs.entries()).map(([id, el]) => ({
    id,
    rect: el.getBoundingClientRect()
  }));

  window.addEventListener('pointermove', onArrowDragMove);
  window.addEventListener('pointerup', onArrowDragEnd);
  updateLines();
};

const onArrowDragMove = (e) => {
  if (!arrowDrag.value.isDragging) return;
  const rect = containerRef.value.getBoundingClientRect();
  arrowDrag.value.x = e.clientX - rect.left;
  arrowDrag.value.y = e.clientY - rect.top;

  let foundId = null;
  for (const cache of blockRectsCache) {
    if (e.clientX >= cache.rect.left && e.clientX <= cache.rect.right &&
        e.clientY >= cache.rect.top && e.clientY <= cache.rect.bottom) {
      foundId = cache.id;
      break;
    }
  }
  arrowDrag.value.hoveredItemId = foundId;
  updateLines();
};

const onArrowDragEnd = () => {
  window.removeEventListener('pointermove', onArrowDragMove);
  window.removeEventListener('pointerup', onArrowDragEnd);

  if (arrowDrag.value.hoveredItemId) {
    const targetIndex = items.value.findIndex(it => it.id === arrowDrag.value.hoveredItemId);
    const targetItem = items.value[targetIndex];

    if (targetIndex !== -1) {
      items.value.forEach(item => {
        if (arrowDrag.value.sourceIds.includes(item.id)) {
          item._targetId = arrowDrag.value.hoveredItemId;
          if (targetItem.command === 'label') {
            item.jumpDest = targetItem.params[0].value;
          } else {
            item.jumpDest = displayIndices.value[targetIndex];
          }
        }
      });
    }
  }

  arrowDrag.value.isDragging = false;
  arrowDrag.value.sourceIds =[];
  arrowDrag.value.hoveredItemId = null;
  blockRectsCache =[];
  updateLines();
};

const updateLines = () => {
  const offsets = new Map();
  let maxBottom = 0;

  items.value.forEach((item) => {
    const el = itemRefs.get(item.id);
    if (el) {
      offsets.set(item.id, {
        top: el.offsetTop,
        height: el.offsetHeight,
        width: el.offsetWidth,
        left: el.offsetLeft
      });
      maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight);
    }
  });

  const groups = new Map();
  items.value.forEach((item, index) => {
    if (item.command === 'jump' && (item._targetId || arrowDrag.value.sourceIds.includes(item.id))) {
      let targetId = item._targetId;

      if (arrowDrag.value.isDragging && arrowDrag.value.sourceIds.includes(item.id)) {
        targetId = '__dragging__';
      }

      const targetIndex = items.value.findIndex(it => it.id === targetId);

      if (targetIndex !== -1 || targetId === '__dragging__') {
        if (!groups.has(targetId)) {
          groups.set(targetId, {
            targetId,
            targetIndex: targetId === '__dragging__' ? -1 : targetIndex,
            sources:[]
          });
        }
        groups.get(targetId).sources.push({ id: item.id, index });
      }
    }
  });

  const lanes =[];
  connectionPaths.value = Array.from(groups.values()).map(group => {
    const isDragGroup = group.targetId === '__dragging__';
    const firstSource = group.sources[0];
    const sourceOff = offsets.get(firstSource.id);
    if (!sourceOff) return null;

    const blockRightEdge = sourceOff.left + sourceOff.width;
    const sourceYs = group.sources.map(s => (offsets.get(s.id)?.top || 0) + 25);

    let targetY, targetX;
    if (isDragGroup) {
      targetY = arrowDrag.value.y;
      targetX = arrowDrag.value.x;
    } else {
      const tOff = offsets.get(group.targetId);
      if (!tOff) return null;
      targetY = tOff.top + 20;
      targetX = tOff.left + tOff.width + 8;
    }

    const minY = Math.min(targetY, ...sourceYs);
    const maxY = Math.max(targetY, ...sourceYs);

    let laneIndex = 0;
    if (!isDragGroup) {
      while (true) {
        const conflict = lanes[laneIndex]?.some(r => minY <= r.max && maxY >= r.min);
        if (!conflict) {
          if (!lanes[laneIndex]) lanes[laneIndex] = [];
          lanes[laneIndex].push({ min: minY, max: maxY });
          break;
        }
        laneIndex++;
      }
    }

    const laneX = blockRightEdge + 30 + (laneIndex * 15);
    let d = "";
    group.sources.forEach(source => {
      const sOff = offsets.get(source.id);
      if (sOff) d += `M ${sOff.left + sOff.width} ${sOff.top + 25} L ${laneX} ${sOff.top + 25} `;
    });
    d += `M ${laneX} ${minY} L ${laneX} ${maxY} `;
    d += `M ${laneX} ${targetY} L ${targetX} ${targetY}`;

    return {
      d,
      target: group.targetIndex,
      targetId: group.targetId,
      sources: group.sources.map(s => s.index),
      sourceIds: group.sources.map(s => s.id),
      endX: targetX,
      endY: targetY,
      isDragging: isDragGroup
    };
  }).filter(Boolean);

  containerHeight.value = maxBottom + 100;
}

const onJumpDestChange = (item) => {
  const destStr = String(item.jumpDest).trim();

  const targetLabel = items.value.find(
      it => it.command === 'label' && it.params[0].value === destStr
  );

  if (targetLabel) {
    item._targetId = targetLabel.id;
  } else {
    const idx = parseInt(destStr);
    if (!isNaN(idx)) {
      const targetIndex = displayIndices.value.indexOf(idx);
      if (targetIndex !== -1) {
        item._targetId = items.value[targetIndex].id;
      } else {
        item._targetId = null;
      }
    } else {
      item._targetId = null;
    }
  }
  updateLines();
};

const onListChange = (evt) => {
  if (evt && evt.moved && isMultiDrag) {
    const { newIndex } = evt.moved;

    const nextUnselected = items.value.slice(newIndex + 1).find(i => !selectedIds.value.has(i.id));
    const remainingItems = items.value.filter(i => !selectedIds.value.has(i.id));

    let insertIndex = remainingItems.length;
    if (nextUnselected) {
      insertIndex = remainingItems.findIndex(i => i.id === nextUnselected.id);
    }

    remainingItems.splice(insertIndex, 0, ...selectedItemsOrderOnDragStart);
    items.value = remainingItems;
    isMultiDrag = false;
  }

  items.value.forEach((item) => {
    if (item.command === 'jump' && item._targetId) {
      const currentTarget = items.value.find(it => it.id === item._targetId);
      if (currentTarget) {
        if (currentTarget.command === 'label') {
          item.jumpDest = currentTarget.params[0].value;
        } else {
          const targetIndex = items.value.indexOf(currentTarget);
          item.jumpDest = displayIndices.value[targetIndex];
        }
      } else {
        item._targetId = null;
      }
    }
  });
  updateLines();
}

const onSetData = (dataTransfer, dragEl) => {
  const id = dragEl.getAttribute('data-item-id');
  if (id && selectedIds.value.has(id) && selectedIds.value.size > 1) {
    if (multiDragImageRef.value) {
      const container = multiDragImageRef.value;
      container.innerHTML = '';

      container.style.width = `${dragEl.offsetWidth}px`;

      const selectedItemsList = items.value.filter(i => selectedIds.value.has(i.id));
      const maxToDisplay = 3;

      selectedItemsList.slice(0, maxToDisplay).forEach((item, index) => {
        const originalNode = itemRefs.get(item.id);
        if (originalNode) {
          const clone = originalNode.cloneNode(true);

          clone.style.display = 'block';
          clone.querySelectorAll('.insert-zone, .element-toolbar').forEach(el => el.remove());

          clone.style.position = index === 0 ? 'relative' : 'absolute';
          clone.style.top = index === 0 ? '0' : `${index * 8}px`;
          clone.style.left = index === 0 ? '0' : `${index * 8}px`;
          clone.style.width = '100%';
          clone.style.zIndex = 10 - index;
          clone.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';

          if (index > 0) clone.style.filter = `brightness(${1 - index * 0.2})`;

          container.appendChild(clone);
        }
      });

      if (selectedItemsList.length > maxToDisplay) {
        const badge = document.createElement('div');
        badge.className = 'multi-drag-badge';
        badge.textContent = `+${selectedItemsList.length - maxToDisplay}`;
        container.appendChild(badge);
      }

      dataTransfer.setDragImage(container, 20, 20);
    }
  }
};

const onDragStart = (evt) => {
  isDragging.value = true;
  const draggedElement = items.value[evt.oldIndex];

  if (draggedElement) {
    if (selectedIds.value.has(draggedElement.id)) {
      if (selectedIds.value.size > 1) {
        isMultiDrag = true;
        primaryDragId.value = draggedElement.id;
        selectedItemsOrderOnDragStart = items.value.filter(i => selectedIds.value.has(i.id));

        selectedIds.value.forEach(id => {
          if (id !== draggedElement.id) {
            const el = itemRefs.get(id);
            if (el) el.style.display = 'none';
          }
        });

      } else {
        isMultiDrag = false;
        primaryDragId.value = draggedElement.id;
      }
    } else {
      selectedIds.value.clear();
      selectedIds.value.add(draggedElement.id);
      lastSelectedId = draggedElement.id;
      isMultiDrag = false;
      primaryDragId.value = draggedElement.id;
    }
  }

  const loop = () => {
    updateLines();
    if (isDragging.value) rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

const onDragEnd = () => {
  isDragging.value = false;

  selectedIds.value.forEach(id => {
    const el = itemRefs.get(id);
    if (el) el.style.display = '';
  });

  isMultiDrag = false;
  primaryDragId.value = null;
  cancelAnimationFrame(rafId);

  justDropped = true;
  setTimeout(() => justDropped = false, 150);

  setTimeout(updateLines, 1);
}

const removeItem = (id) => {
  items.value = items.value.filter(i => i.id !== id);
  selectedIds.value.delete(id);
  nextTick(onListChange);
}

const addItem = (index) => {
  const newItem = createNewElement('set',[]);
  items.value.splice(index + 1, 0, newItem);
  nextTick(onListChange);
}

const copyItem = (index, event) => {
  if (event instanceof Event) return;

  const source = items.value[index];
  const newItem = createNewElement(source.command, source.params.map(p => p.value));
  newItem.jumpDest = source.jumpDest;
  newItem._targetId = source._targetId;
  items.value.splice(index + 1, 0, newItem);
  nextTick(onListChange);
}

const handleGlobalClick = (e) => {
  if (!e.target.closest('.element-wrapper') && !e.target.closest('.btn-reset')) {
    deselectAll();
  }
}

onMounted(async () => {
  window.addEventListener('click', closePopup);
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize', updateLines);

  await nextTick();

  if (contentSource.value) {
    const text = contentSource.value.textContent;
    if (text?.trim()) {
      const parser = new Parser(text);
      parser.maxInstructions = settings.max_lines;
      parser.maxJumps = settings.max_jumpes;

      const newList = parser.parse();
      items.value = newList;

      setTimeout(updateLines, 100);
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateLines);
  window.removeEventListener('click', closePopup);
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('keydown', handleGlobalKeydown);
  cancelAnimationFrame(rafId);
  clearTimeout(autoTimer);
});
</script>

<style scoped>
.logic-canvas { min-height: 100vh; }
.connections-layer {
  position: absolute; top: 0; left: 0; width: 100%;
  pointer-events: none; z-index: 2; overflow: visible;
}
.jump-line { transition: stroke 0.2s; }
.element-wrapper { margin-bottom: 8px; position: relative; transition: opacity 0.2s; }

.ghost-item {
  opacity: 0.6 !important;
  filter: drop-shadow(0 0 5px rgba(140, 107, 237, 0.4));
  outline: 2px dashed #8c6bed !important;
  outline-offset: -2px;
}

.element-toolbar {
  position: absolute;
  top: 0px;
  left: -50px;
  z-index: 40;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 2px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  padding: 4px 6px;
}
.element-toolbar button {
  background: transparent;
  border: 0;
  color: white;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 3px;
  border-radius: 9px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.element-toolbar button:hover {
  box-shadow: inset 0 0 5px #a3d2ff;
  transform: translateY(-1px);
}

.is-arrow-dragging {
  cursor: grabbing !important;
}
.is-arrow-dragging * {
  cursor: grabbing !important;
}

:deep(.is-drop-target) {
  outline: 2px #f7ce74 !important;
  outline-offset: 3px;
  box-shadow: 0 0 10px rgba(247, 206, 116, 0.5);
  transition: outline 0.1s, box-shadow 0.1s;
}

:deep(.is-executing) {
  outline: 2px solid #b8d8be !important;
  outline-offset: 2px;
  z-index: 10;
  transform-origin: left center;
  transition: transform 0.2s ease-out, outline 0.2s, box-shadow 0.2s;
}

:deep(.is-selected-block) {
  outline: 2px solid #8c6bed !important;
  outline-offset: 2px;
  background-color: rgba(140, 107, 237, 0.15) !important;
  border-radius: 6px;
}

:deep(.is-label) {
  filter: saturate(0.5);
}

.params-row { display: flex; gap: 12px; flex-wrap: wrap; padding: 4px; }
.param-box { display: flex; align-items: center; }
.param-label { font-size: 18px; }

.param-input {
  background: transparent; border: none; border-bottom: 4px solid;
  color: white; padding: 2px; font-size: 18px; font-family: inherit;
  margin-left: 6px; outline: none; min-width: 40px; max-width: 140px;
  opacity: 0.8;
}

.jump-dest-input {
  border-bottom-color: #f7ce74 !important;
  width: 50px;
  color: #f7ce74;
  font-weight: bold;
}

.custom-select-wrapper { position: relative; }
.enum-popup {
  position: absolute; top: 100%; left: 0; margin-top: 4px;
  background: #000; border: 4px solid #4a4a4a;
  display: grid; grid-template-columns: 1fr 1fr;
  z-index: 100; min-width: 180px;
}
.enum-option {
  color: #fff; padding: 8px; cursor: pointer; text-align: center;
  text-shadow:
      1px   1px 1px black,
      -1px  1px 1px black,
      -1px -1px 1px black,
      1px  -1px 1px black;
}
.enum-option:hover { background: rgba(255,255,255,0.1); }
.enum-option.is-selected { background: #f7ce74; }

.btn-reset {
  background-color: transparent;
  color: #8c6bed;
  border: 4px solid #8c6bed;
  padding: 4px 12px;
  font-size: 16px;
  font-family: inherit;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background-color: #8c6bed;
  border-color: #343333;
  color: #fff;
  box-shadow: 0 0 8px rgba(140, 107, 237, 0.6);
}

.btn-reset:active {
  transform: translateY(2px);
}

.vars-fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 15, 15, 0.95);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(5px);
}

.btn-auto-active {
  background-color: rgba(99, 53, 248, 0.4) !important;
  color: #fff !important;
  box-shadow: inset 0 0 5px #8c6bed !important;
  border: 1px solid #8c6bed !important;
}

.insert-zone, .insert-zone-static {
  position: absolute;
  left: 0;
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 45;
  cursor: pointer;
  transition: opacity 0.2s;
}

.insert-zone {
  bottom: -14px;
}

.insert-zone-static {
  position: relative;
  margin-top: 10px;
  margin-bottom: -4px;
}

.is-dragging .insert-zone,
.is-arrow-dragging .insert-zone,
.is-dragging .insert-zone-static,
.is-arrow-dragging .insert-zone-static {
  display: none;
}

.insert-zone:hover, .insert-zone-static:hover {
  opacity: 1;
}

.insert-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background-color: #8c6bed;
  z-index: 1;
}

.insert-btn {
  position: relative;
  z-index: 2;
  background: #8c6bed;
  color: white;
  border: 2px solid #1a1a1a;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 0 8px rgba(140, 107, 237, 0.4);
}

.insert-btn:hover {
  transform: scale(1.2);
  background-color: #a38bf5;
}

.multi-drag-image-container {
  position: absolute;
  top: -9999px;
  left: -9999px;
  z-index: -9999;
  opacity: 1;
  pointer-events: none;
}

:deep(.multi-drag-badge) {
  position: absolute;
  bottom: -15px;
  right: -15px;
  background-color: #f7ce74;
  color: #1a1a1a;
  font-weight: bold;
  font-size: 16px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 3px solid #1a1a1a;
  z-index: 20;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

.insert-zone {
  position: absolute;
  left: 0;
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 45;
  cursor: pointer;
  transition: opacity 0.2s;
  bottom: -14px;
}

.is-dragging .insert-zone,
.is-arrow-dragging .insert-zone {
  display: none;
}

.insert-zone:hover {
  opacity: 1;
}

.insert-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background-color: #8c6bed;
  z-index: 1;
}

.big-insert-btn {
  width: 100%;
  height: 100%;
}

.sub-blocks-container {
  width: 100%;
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-block {
  display: flex;
  gap: 8px;
  font-family: monospace;
  font-size: 14px;
  color: #ccc;
  padding: 4px 8px;
  border-left: 2px solid transparent;
  transition: all 0.2s;
}

.sub-cmd {
  color: #8c6bed;
  font-weight: bold;
}

.sub-param {
  color: #fff;
}

.is-sub-executing {
  border-left: 2px solid #b8d8be;
  background: rgba(184, 216, 190, 0.15);
  color: #fff;
}
</style>