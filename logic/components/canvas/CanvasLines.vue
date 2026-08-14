<template>
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
          :cx="path.endX" :cy="path.endY" r="16" fill="transparent"
          :style="{
            pointerEvents: path.isEditLocked ? 'none' : 'auto',
            cursor: path.isEditLocked ? 'default' : 'grab'
          }"
          @pointerdown.stop.prevent="path.isEditLocked ? null : $emit('startArrowDrag', $event, path)"
      />
      <polygon
          :points="`${path.endX-8},${path.endY} ${path.endX+18},${path.endY-12} ${path.endX+18},${path.endY+12}`"
          :fill="activePathIds.has(i) || path.isDragging ? '#6335f8' : (path.isEditLocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)')"
          style="pointer-events: none;"
      />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  connectionPaths: Array,
  activePathIds: Set,
  containerHeight: Number
})
defineEmits(['startArrowDrag'])
</script>

<style scoped>
.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}

.jump-line {
  transition: stroke 0.2s;
}
.sub-blocks-container {
  padding-left: 20px;
  border-left: 2px solid rgba(255,255,255,0.1);
  margin-left: 10px;
}
</style>