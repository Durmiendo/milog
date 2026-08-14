<template>
  <div
      ref="containerRef"
      tabindex="-1"
      class="logic-canvas"
      :class="{ 'is-dragging': canvas.isDragging.value, 'is-arrow-dragging': canvas.arrowDrag.value.isDragging }"
      style="position: relative; width: 100%; outline: none;"
      @keydown="handleKeydown"
      @click="handleGlobalClick"
  >
    <div ref="contentSource" v-if="!core.items.value.length" style="display: none;">
      <slot/>
    </div>

    <CanvasLines
        :connectionPaths="canvas.connectionPaths.value"
        :activePathIds="canvas.activePathIds.value"
        :containerHeight="canvas.containerHeight.value"
        @startArrowDrag="canvas.startArrowDrag"
    />

    <ClientOnly>
      <Toolbars
          :settings="core.settings"
          :isAutoRunning="core.isAutoRunning.value"
          :isCodeLocked="core.isCodeLocked.value"
          :allowCustomBlocks="core.allowCustomBlocks.value && !core.isCodeLocked.value"
          @reset="resetSettings"
          @resetRun="core.resetTests()"
          @copy="core.copySelected"
          @paste="core.pasteClipboard"
          @clear="core.clearAll"
          @addBlock="openAddMenu(core.items.value.length)"
          @run="core.next(false, canvas.itemRefs)"
          @toggleAuto="core.toggleAuto"
          @showVars="core.showVars.value = true"
          @showMocks="core.showMocks.value = true"
          @goTo="goToCurrent"
      />

      <div v-if="!core.isCodeLocked.value && core.items.value.length > 0 && !isNextConnectLocked(-1)" class="top-insert">
        <InsertZone @add="openAddMenu(0)"/>
      </div>

      <draggable
          v-model="core.items.value"
          handle=".header"
          item-key="id"
          ghost-class="ghost-item"
          filter=".is-drag-locked"
          :move="onMove"
          :animation="0"
          :disabled="core.isCodeLocked.value"
          :setData="canvas.onSetData"
          @start="canvas.onDragStart"
          @end="canvas.onDragEnd"
          @change="canvas.onListChange"
      >
        <template #item="{ element, index }">
          <div
              :ref="el => canvas.setItemRef(el, element.id)"
              :data-item-id="element.id"
              class="element-wrapper"
              @mouseenter="canvas.hoveredIndex.value = index"
              @mouseleave="canvas.hoveredIndex.value = null"
              @click="toggleSelection($event, element)"
              :class="{
                'is-drag-locked': element.lockMove,
                'is-locked-block': element.lockEdit || element.lockMove || element.lockConnect,
                'is-locked-connected-next': isNextConnectLocked(index),
                'is-locked-connected-prev': isPrevConnectLocked(index)
              }"
              :style="{ zIndex: core.activePopup.value?.startsWith(element.id) ? 50 : (core.activeExecutingIndex.value === index ? 40 : (canvas.hoveredIndex.value === index ? 30 : 2)) }"
          >
            <LogicElement
                class="processor-block"
                :style="{ '--progress': getTemplateProgress(element, index) + '%' }"
                :type="element"
                :index="core.displayIndices.value[index]"
                :title="element.command"
                :color="core.getCommandColor(element.command)"
                :control="!element.lockEdit && !core.isCodeLocked.value"
                :locked="element.lockEdit || element.lockMove || element.lockConnect"
                @remove="removeItem(element.id)"
                @copy="copyItem(index)"
                @add="openAddMenu(index + 1)"
                :class="{
                'is-active': canvas.hoveredIndex.value === index || isConnected(index) || element.id === canvas.arrowDrag.value.hoveredItemId,
                'is-drop-target': element.id === canvas.arrowDrag.value.hoveredItemId,
                'is-executing': core.activeExecutingIndex.value === index,
                'is-template-executing': core.activeExecutingIndex.value === index && templateRegistry[element.command],
                'is-selected-block': core.selectedIds.value.has(element.id),
                'is-label': element.command === 'label'
              }"
            >
              <div class="params-row" @copy.stop>

                <template v-if="templateRegistry[element.command]">
                  <component
                      :is="dynamicTemplates[templateRegistry[element.command].componentName]"
                      :element="element"
                      :disabled="element.lockEdit || core.isCodeLocked.value"
                      @update="canvas.updateLines"
                  />
                </template>

                <template v-else>
                  <div v-if="element.command === 'jump'" class="param-box">
                    <span class="param-label">dest:</span>
                    <input type="text" v-model="element.jumpDest" class="param-input jump-dest-input"
                           :disabled="element.lockEdit || core.isCodeLocked.value"
                           @input="onJumpDestChange(element)"/>
                  </div>

                  <div v-for="(p, pIdx) in element.params" :key="pIdx" class="param-box">
                    <span class="param-label">{{ p.label }}:</span>
                    <div v-if="p.type === 'enum'" class="custom-select-wrapper">
                      <!-- Блокируем выбор только если это стандартный параметр И блок залочен (аргументы выбора [choice: ...] остаются разлоченными) -->
                      <div class="param-input select-trigger"
                           :class="{ 'disabled-trigger': !p.isChoice && (element.lockEdit || core.isCodeLocked.value) }"
                           @click.stop="(!p.isChoice && (element.lockEdit || core.isCodeLocked.value)) ? null : togglePopup(`${element.id}-${p.label}`)">
                        {{ p.value }}
                      </div>
                      <div v-if="core.activePopup.value === `${element.id}-${p.label}`" class="enum-popup" @click.stop>
                        <div v-for="opt in p.options" :key="opt" class="enum-option"
                             :class="{ 'is-selected': p.value === opt }" @click="selectOption(element, p, opt)">{{
                            opt
                          }}
                        </div>
                      </div>
                    </div>
                    <input v-else type="text" v-model="p.value" class="param-input"
                           :disabled="!p.isChoice && (element.lockEdit || core.isCodeLocked.value)"
                           @input="canvas.updateLines"/>
                  </div>
                </template>

                <template v-if="core.flatCodeInfo.value.generatedMap.get(element.id)?.length > 0">
                  <div class="param-box template-controls">
                    <button v-if="!element.lockEdit && !core.isCodeLocked.value" class="toggle-btn unwrap-btn" @click.stop="unwrapTemplate(index)">unwrap</button>
                    <button class="toggle-btn" @click.stop="toggleOperations(element)">
                      {{ element._collapsed ? 'show operations' : 'hide operations' }}
                    </button>
                  </div>

                  <div v-if="!element._collapsed" class="sub-blocks-container">
                    <div
                        v-for="(genBlock, gIdx) in core.flatCodeInfo.value.generatedMap.get(element.id)"
                        :key="genBlock.id"
                        :ref="el => canvas.setItemRef(el, genBlock.id)"
                        :data-item-id="genBlock.id"
                        class="sub-block-wrapper"
                    >
                      <LogicElement
                          :type="genBlock"
                          :title="genBlock.command"
                          :color="core.getCommandColor(genBlock.command)"
                          :index="(core.flatCodeInfo.value.itemToFlatMap.get(element.id)?.start || 0) + gIdx"
                          :control="false"
                          class="mini-logic-element processor-block"
                          :class="{
                          'is-mini-executing': core.activeExecutingIndex.value === index && core.activeSubIndex.value === gIdx,
                          'is-drop-target': genBlock.id === canvas.arrowDrag.value.hoveredItemId
                        }"
                      >
                        <div class="params-row mini-params-row">
                          <div v-for="(gp, pIdx) in genBlock.params" :key="pIdx" class="param-box">
                            <span v-if="gp.label" class="param-label">{{ gp.label }}:</span>
                            <div class="param-input disabled-input">{{ gp.value }}</div>
                          </div>
                        </div>
                      </LogicElement>
                    </div>
                  </div>
                </template>

              </div>
            </LogicElement>
            <InsertZone v-if="!core.isCodeLocked.value && !isBetweenConnectLocked(index)" @add="openAddMenu(index + 1)"/>
          </div>
        </template>
      </draggable>

      <!-- Оформление задания (полые рамки без заливки фона) -->
      <div v-if="core.testCases.value.length > 0" class="task-logic-wrapper">
        <LogicElement
            :index="`${core.testCases.value.filter(t => t.passed).length} / ${core.testCases.value.length}`"
            :title="taskTitle || 'Проверка задания'"
            color="#f7ce74"
            :control="false"
        >
          <div class="task-body">
            <div class="test-rows-container">
              <div
                  v-for="(tc, idx) in core.testCases.value"
                  :key="idx"
                  class="task-test-row"
                  :class="{ 'is-passed': tc.passed }"
              >
                <span class="test-status-symbol">{{ tc.passed ? 'готово' : 'нет' }}</span>
                <span class="test-desc-text">{{ tc.customMessage || tc.expression }}</span>
                <span class="test-row-value">{{ tc.currentValue || 'нет данных' }}</span>
              </div>
            </div>

            <div class="task-status-bar" :class="{ 'all-passed': core.allTestsPassed.value }">
              {{ core.allTestsPassed.value ? 'задание выполнено' : 'ожидание запуска' }}
            </div>

            <div v-if="lesson && lessonSolved" class="task-saved-bar">
              Урок засчитан, прогресс сохранён в браузере
            </div>
          </div>
        </LogicElement>
      </div>

    </ClientOnly>

    <Teleport to="body">
      <div v-if="core.showVars.value" class="vars-fullscreen-overlay">
        <Vars :asm="core.asm.value" @close="core.showVars.value = false"/>
      </div>
      <div v-if="core.showMocks.value" class="vars-fullscreen-overlay" style="overflow-y: auto;"
           @click.self="core.showMocks.value = false">
        <Mock :world="core.world" @close="core.showMocks.value = false"/>
      </div>
      <div v-if="core.showAddMenu.value" class="vars-fullscreen-overlay" @click.self="core.showAddMenu.value = false">
        <Add @select="handleAddCommand" @close="core.showAddMenu.value = false"/>
      </div>
      <div ref="multiDragImageRef" class="multi-drag-image-container">
        <div class="multi-drag-card">Перемещение {{ core.selectedIds.value.size }} блоков...</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import {defineAsyncComponent, ref, onMounted, onUnmounted, nextTick, computed, watch} from 'vue'
import {useData} from 'vitepress'

const draggable = defineAsyncComponent(() => import('vuedraggable'))

import LogicElement from './components/blocks/LogicElement.vue'
import CanvasLines from './components/canvas/CanvasLines.vue'
import Toolbars from './components/canvas/Toolbars.vue'
import InsertZone from './components/blocks/InsertZone.vue'

import Vars from './components/modals/VarsModal.vue'
import Add from './components/modals/AddModal.vue'
import Mock from './components/modals/MockModal.vue'

import {useLogicCore} from './composables/useLogicCore.js'
import {useLogicCanvas} from './composables/useLogicCanvas.js'
import {useProgress} from './composables/useProgress.js'
import {Parser} from './core/parser.js'
import {templateRegistry} from './core/templates.js'

import MathTemplate from './components/blocks/templates/MathTemplate.vue'
import ChoiceTemplate from './components/blocks/templates/ChoiceTemplate.vue'

const props = defineProps({
  lesson: {type: String, default: ''}
})

const dynamicTemplates = {MathTemplate, ChoiceTemplate}
const containerRef = ref(null)
const contentSource = ref(null)
const multiDragImageRef = ref(null)

const {frontmatter} = useData()
const taskTitle = computed(() => frontmatter.value?.title || '')

const core = useLogicCore(() => canvas.updateLines())
const canvas = useLogicCanvas(core, containerRef, multiDragImageRef)

const {isSolved, markSolved} = useProgress()
const lessonSolved = computed(() => isSolved(props.lesson))

watch(core.allTestsPassed, (passed) => {
  if (passed && props.lesson) markSolved(props.lesson)
})

const getTemplateProgress = (element, index) => {
  if (core.activeExecutingIndex.value !== index) return 0
  const generated = core.flatCodeInfo.value.generatedMap.get(element.id)
  if (!generated || generated.length === 0) return 0
  const subIndex = core.activeSubIndex.value
  return (subIndex / generated.length) * 100
}

const isConnected = (index) => canvas.connectionPaths.value.some(p => p.target === index || p.sources.includes(index))

const togglePopup = (id) => core.activePopup.value = core.activePopup.value === id ? null : id
const selectOption = (element, param, opt) => {
  param.value = opt;
  canvas.updateLines();
  core.activePopup.value = null
}

const onJumpDestChange = (element) => {
  const dest = String(element.jumpDest ?? '').trim()
  const flat = core.flatCodeInfo.value.flat

  const label = core.items.value.find(i => i.command === 'label' && i.params[0]?.value === dest)

  if (label) {
    element._targetId = flat.find(f => f._parentId === label.id)?.id || null
  } else {
    const index = parseInt(dest, 10)
    element._targetId = (!isNaN(index) && flat[index]) ? flat[index].id : null
  }

  nextTick(canvas.updateLines)
}

const resetSettings = () => {
  core.settings.ips = 0.3;
  core.settings.max_lines = 1000;
  core.settings.max_jumpes = 500
}
const openAddMenu = (index) => {
  core.insertIndex.value = index;
  core.showAddMenu.value = true
}
const handleAddCommand = (cmd) => {
  core.items.value.splice(core.insertIndex.value, 0, core.createNewElement(cmd, []))
  core.showAddMenu.value = false
  nextTick(canvas.updateLines)
}

const removeItem = (id) => {
  core.items.value = core.items.value.filter(i => i.id !== id)
  core.selectedIds.value.delete(id)
  nextTick(canvas.updateLines)
}

const copyItem = (index) => {
  const source = core.items.value[index]
  const newItem = core.createNewElement(source.command, source.params.map(p => p.value))
  newItem.jumpDest = source.jumpDest;
  newItem._targetId = source._targetId
  core.items.value.splice(index + 1, 0, newItem)
  nextTick(canvas.updateLines)
}

const unwrapTemplate = (index) => {
  const item = core.items.value[index]
  const generated = core.flatCodeInfo.value.generatedMap.get(item.id)

  let newBlocks = []
  if (generated && generated.length > 0) {
    newBlocks = generated.map(gen => ({
      ...gen,
      id: gen.id,
      params: gen.params.map(p => ({...p})),
      _collapsed: false,
      jumpDest: gen.jumpDest || '',
      _targetId: gen._targetId || null
    }))
  } else {
    newBlocks = [core.createNewElement('set', ['null', 'null'])]
    newBlocks[0].id = `${item.id}_sub_0`
  }

  core.items.value.splice(index, 1, ...newBlocks)
  core.selectedIds.value.delete(item.id)
  nextTick(canvas.updateLines)
}

const toggleOperations = (element) => {
  element._collapsed = !element._collapsed
  nextTick(canvas.updateLines)
}

const toggleSelection = (e, item) => {
  if (canvas.justDropped || ['INPUT', 'BUTTON'].includes(e.target.tagName)) return

  // Строго запрещаем интерактивное выделение блоков с блокировкой перемещения
  if (item.lockMove) return

  if (e.ctrlKey || e.metaKey) {
    core.selectedIds.value.has(item.id) ? core.selectedIds.value.delete(item.id) : core.selectedIds.value.add(item.id)
    core.lastSelectedId = item.id
  } else if (e.shiftKey && core.lastSelectedId) {
    const min = Math.min(core.items.value.findIndex(i => i.id === core.lastSelectedId), core.items.value.findIndex(i => i.id === item.id))
    const max = Math.max(core.items.value.findIndex(i => i.id === core.lastSelectedId), core.items.value.findIndex(i => i.id === item.id))
    for (let i = min; i <= max; i++) {
      const it = core.items.value[i]
      if (it && !it.lockMove) {
        core.selectedIds.value.add(it.id)
      }
    }
  } else {
    // Если блок уже выделен и является ЕДИНСТВЕННЫМ выделенным блоком - снимаем выделение!
    if (core.selectedIds.value.has(item.id) && core.selectedIds.value.size === 1) {
      core.selectedIds.value.clear()
      core.lastSelectedId = null
    } else {
      core.selectedIds.value.clear()
      core.selectedIds.value.add(item.id)
      core.lastSelectedId = item.id
    }
  }
}

const handleGlobalClick = (e) => {
  if (!e.target.closest('.element-wrapper') && !e.target.closest('.btn-reset')) core.selectedIds.value.clear()
  core.activePopup.value = null
}

const handleKeydown = (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      core.copySelected()
    }
    if (e.key.toLowerCase() === 'v') {
      e.preventDefault();
      core.pasteClipboard()
    }
    if (e.key.toLowerCase() === 'a') {
      e.preventDefault();
      // Выделяем все элементы за исключением блоков с залоченным перемещением
      core.items.value.forEach(i => {
        if (!i.lockMove) {
          core.selectedIds.value.add(i.id)
        }
      })
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (core.selectedIds.value.size > 0) {
      e.preventDefault();
      core.items.value = core.items.value.filter(i => !core.selectedIds.value.has(i.id))
      core.selectedIds.value.clear();
      nextTick(canvas.updateLines)
    }
  } else if (e.key === 'Escape') {
    core.selectedIds.value.clear();
    core.activePopup.value = null
  }
}

// Методы-проверки наличия соседней блокировки связей для мультирамки
const isNextConnectLocked = (index) => {
  const current = core.items.value[index]
  const next = core.items.value[index + 1]
  return current && current.lockConnect && next && next.lockConnect
}

const isPrevConnectLocked = (index) => {
  const current = core.items.value[index]
  const prev = core.items.value[index - 1]
  return current && current.lockConnect && prev && prev.lockConnect
}

const isBetweenConnectLocked = (index) => {
  const current = core.items.value[index]
  const next = core.items.value[index + 1]
  return current && current.lockConnect && next && next.lockConnect
}

// Запрещает перетаскивать drag-locked элементы и вставлять сторонние блоки внутрь соединенных рамкой
const onMove = (evt) => {
  const draggedItem = evt.draggedContext.element
  if (draggedItem && draggedItem.lockMove) {
    return false
  }

  const relatedIndex = evt.relatedContext.index
  const willInsertAfter = evt.willInsertAfter

  if (willInsertAfter) {
    const current = core.items.value[relatedIndex]
    const next = core.items.value[relatedIndex + 1]
    if (current?.lockConnect && next?.lockConnect) {
      return false
    }
  } else {
    const prev = core.items.value[relatedIndex - 1]
    const current = core.items.value[relatedIndex]
    if (prev?.lockConnect && current?.lockConnect) {
      return false
    }
  }
  return true
}

onMounted(() => {
  window.addEventListener('resize', canvas.updateLines)

  if (contentSource.value) {
    const worldElement = contentSource.value.querySelector('world')

    if (worldElement) {
      const mockEl = worldElement.querySelector('.language-mock pre') || worldElement.querySelector('pre.mock')
      const codeEl = worldElement.querySelector('.language-code pre') || worldElement.querySelector('.language-logic pre') || worldElement.querySelector('pre.code')
      const testsEl = worldElement.querySelector('.language-tests pre') || worldElement.querySelector('.language-tasks pre') || worldElement.querySelector('pre.tests')

      const cleanText = (el) => {
        if (!el) return ''
        return el.textContent.replace(/\u00A0/g, ' ')
      }

      const mockText = cleanText(mockEl)
      const codeText = cleanText(codeEl)
      const testsText = cleanText(testsEl)

      if (mockText.trim()) {
        core.setupMockEnvironment(mockText)
      }

      if (codeText.trim()) {
        const parser = new Parser(codeText)
        parser.maxInstructions = core.settings.max_lines
        parser.maxJumps = core.settings.max_jumpes
        core.items.value = parser.parse()
        core.items.value.forEach(i => i._collapsed = false)
      }

      if (testsText.trim()) {
        core.parseTests(testsText)
      }
    } else {
      const fallbackText = contentSource.value.textContent
      if (fallbackText?.trim()) {
        const parser = new Parser(fallbackText)
        parser.maxInstructions = core.settings.max_lines
        parser.maxJumps = core.settings.max_jumpes
        core.items.value = parser.parse()
        core.items.value.forEach(i => i._collapsed = false)
      }
    }

    setTimeout(canvas.updateLines, 100)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', canvas.updateLines);
  core.stopEngine()
})
</script>

<style scoped>
.logic-canvas {
  padding-bottom: 8px;
}

.top-insert {
  position: relative;
  height: 14px;
}

.element-wrapper {
  margin-bottom: 8px;
  position: relative;
  transition: opacity 0.2s;
  box-sizing: border-box !important;
}

.element-wrapper.is-locked-connected-next {
  margin-bottom: 0 !important;
}

/* Изменяем курсор мыши на стандартный для блоков, заблокированных на перемещение */
.element-wrapper.is-drag-locked :deep(.header) {
  cursor: default !important;
}
.element-wrapper.is-drag-locked :deep(.header:active) {
  cursor: default !important;
}

.ghost-item {
  opacity: 0.6 !important;
  filter: drop-shadow(0 0 5px rgba(140, 107, 237, 0.4));
  outline: 2px dashed #8c6bed !important;
  outline-offset: -2px;
}

:deep(.toolbars) {
  position: sticky;
  top: var(--vp-nav-height, 64px);
  z-index: 45;
  background: var(--vp-c-bg);
  padding-top: 6px;
}

:deep(.processor-block) {
  outline: 2px solid transparent;
  outline-offset: 0px;
  position: relative;
  transition: outline 0.15s ease-out, outline-offset 0.15s ease-out, box-shadow 0.15s ease-out;
}

:deep(.processor-block.is-executing) {
  outline: 2px solid #b8d8be !important;
  outline-offset: 2px;
  box-shadow: 0 0 10px rgba(184, 216, 190, 0.3);
  z-index: 10;
}

:deep(.processor-block.is-template-executing) {
  outline-color: rgba(184, 216, 190, 0.4) !important;
}

:deep(.processor-block::after) {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid white;
  pointer-events: none;
  clip-path: inset(0 calc(100% - var(--progress, 0%)) 0 0);
  opacity: 0;
  transition: clip-path 0.05s linear, opacity 0.2s ease-out;
  z-index: 1;
}

:deep(.processor-block.is-template-executing::after) {
  opacity: 1;
}

.is-arrow-dragging, .is-arrow-dragging * {
  cursor: grabbing !important;
}

:deep(.is-drop-target) {
  outline: 2px #f7ce74 !important;
  outline-offset: 3px;
  box-shadow: 0 0 10px rgba(247, 206, 116, 0.5);
}

/* Стилизация выделенного блока в игровом пиксельном стиле */
/* Используем outline вместо border, чтобы избежать изменения размеров и дергания верстки при выделении */
:deep(.processor-block.is-selected-block) {
  outline: 3px dashed #8c6bed !important;
  outline-offset: -3px; /* Сдвиг внутрь, сохраняет исходные размеры элемента */
  background-color: rgba(140, 107, 237, 0.08) !important;
  border-radius: 0 !important;
  box-shadow: 0 0 10px rgba(140, 107, 237, 0.3) !important;
}

:deep(.is-label) {
  filter: saturate(0.5);
}

.params-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 4px;
}

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
  border-bottom: 4px solid #888;
  color: white;
  padding: 2px;
  font-size: 18px;
  margin-left: 6px;
  outline: none;
  min-width: 40px;
  max-width: 140px;
  opacity: 0.8;
}

.param-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  border-bottom-color: #555 !important;
}

.jump-dest-input {
  border-bottom-color: #f7ce74 !important;
  width: 50px;
  color: #f7ce74;
  font-weight: bold;
}

.custom-select-wrapper {
  position: relative;
}

.disabled-trigger {
  cursor: not-allowed !important;
  opacity: 0.5;
  border-bottom-color: #555 !important;
}

.enum-popup {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #000;
  border: 4px solid #4a4a4a;
  display: grid;
  grid-template-columns: 1fr 1fr;
  z-index: 100;
  min-width: 180px;
}

.enum-option {
  font-family: inherit;
  color: #fff;
  padding: 8px;
  cursor: pointer;
  text-align: center;
}

.enum-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.enum-option.is-selected {
  background: #f7ce74;
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

.multi-drag-image-container {
  position: absolute;
  top: -9999px;
  left: -9999px;
  z-index: -9999;
  opacity: 1;
  pointer-events: none;
}

:deep(.multi-drag-badge) {
  font-family: inherit;
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
}

.sub-blocks-container {
  width: 100%;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
}

.mini-logic-element {
  margin: 2px 0 !important;
  padding: 4px 6px !important;
  font-size: 14px !important;
  opacity: 0.9;
}

.mini-params-row {
  gap: 8px !important;
  padding: 0 !important;
}

.mini-params-row .param-label {
  font-size: 14px;
  font-family: inherit;
}

.mini-params-row .disabled-input {
  font-size: 14px !important;
  pointer-events: none;
}

.is-mini-executing {
  opacity: 1;
  transform: translateX(8px);
  outline: 2px solid #b8d8be !important;
}

.template-controls {
  margin-left: auto;
  gap: 8px;
}

.toggle-btn {
  font-family: inherit;
  background-color: transparent;
  color: #f7ce74;
  border: 2px solid #f7ce74;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background-color: #f7ce74;
  color: #1a1a1a;
}

.unwrap-btn {
  color: #a38bf5;
  border-color: #a38bf5;
}

.unwrap-btn:hover {
  background-color: #a38bf5;
  color: #1a1a1a;
  box-shadow: 0 0 8px rgba(163, 139, 245, 0.4);
}

/* Сверхконтрастная ярко-золотая рамка залоченных блоков */
.element-wrapper.is-locked-block {
  border: 3px solid #f7ce74 !important;
  padding: 6px !important; /* Паддинг между внешней рамкой и внутренним блоком */
  background-color: #15151b !important;
  box-sizing: border-box !important;
}

/* Сверхконтрастная серебристо-серая рамка для блоков с запретом перемещения (is-drag-locked) */
.element-wrapper.is-drag-locked {
  border: 3px solid #b0b0b5 !important;
}

/* Убираем рамки у внутреннего блока, если он залочен, чтобы избежать дублирования */
.element-wrapper.is-locked-block :deep(.processor-block) {
  border: none !important;
  border-radius: 0 !important;
}

/* Слияние рамок (мультирамка) для соединенных залоченных блоков */
.element-wrapper.is-locked-connected-next :deep(.processor-block) {
  border-bottom: none !important;
  margin-bottom: 0 !important;
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.element-wrapper.is-locked-connected-prev :deep(.processor-block) {
  border-top: none !important;
  margin-top: 0 !important;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}

/* Стилизация блока задания (полые рамки без заливки фона) */
.task-logic-wrapper {
  margin-top: 24px;
  margin-left: 8px;
  margin-right: 8px;
}

.task-body {
  font-family: 'MindustryLogic', monospace, serif;
}

.test-rows-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}

.task-test-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 5px 10px;
  border-left: 4px solid #55555f;
  background-color: rgba(255, 255, 255, 0.03);
  font-size: 16px;
  transition: border-color 0.2s, background-color 0.2s;
}

.task-test-row.is-passed {
  border-left-color: #b8d8be;
  background-color: rgba(184, 216, 190, 0.07);
}

.test-status-symbol {
  white-space: nowrap;
  min-width: 68px;
  font-size: 14px;
  color: #8a8a95;
}

.task-test-row.is-passed .test-status-symbol {
  color: #b8d8be;
}

.test-desc-text {
  color: #e6e6ea;
  flex: 1;
  min-width: 0;
}

.test-row-value {
  font-size: 13px;
  color: #7c7c88;
  white-space: nowrap;
}

.task-status-bar {
  text-align: center;
  font-size: 15px;
  color: #15151b;
  background-color: #f7ce74;
  padding: 6px;
}

.task-status-bar.all-passed {
  background-color: #b8d8be;
}

.task-saved-bar {
  margin-top: 8px;
  text-align: center;
  font-size: 13px;
  color: #b8d8be;
  padding: 6px;
}
</style>