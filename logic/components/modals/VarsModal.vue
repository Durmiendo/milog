<template>
  <div class="vars-container">
    <div class="vars-header">
      <h2>Variables</h2>
      <button class="btn-close" @click="$emit('close')">Close (ESC)</button>
    </div>

    <div class="vars-content">
      <template v-if="displayVars.length > 0">
        <div class="table-wrapper">
          <table class="vars-table">
            <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Value</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="variable in displayVars" :key="variable.name" :class="{'row-system': variable.constant}">
              <td class="col-name">
                {{ variable.name }}
                <span v-if="variable.constant" class="badge-const">const</span>
              </td>
              <td class="col-type">
                <span class="type-label">{{ getVarType(variable) }}</span>
              </td>
              <td class="col-value">
                {{ getVarValue(variable) }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else class="empty-state">
        No variables found in memory.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  asm: {
    type: Object,
    required: false
  }
});

const emit = defineEmits(['close']);

const tick = ref(0);
let updateTimer = null;

const handleKeydown = (e) => {
  if (e.key === 'Escape') emit('close');
};

const displayVars = computed(() => {
  tick.value;

  if (!props.asm || !props.asm.vars) return[];

  const allVars = Object.values(props.asm.vars);

  const regularVars = allVars.filter(v => true);

  const allowedSysNames = ['true', 'false', 'null'];
  const systemConsts = allVars.filter(v => {
    if (!v.constant) return false;
    return v.name.startsWith('@') || allowedSysNames.includes(v.name);
  });

  return [...regularVars, ...systemConsts];
});

const getVarType = (v) => {
  if (!v) return 'Unknown';
  if (v.isobj) {
    if (v.objval === null) return 'Null';
    if (v.objval && v.objval.constructor && v.objval.constructor.name !== 'Object') {
      return `Object <${v.objval.constructor.name}>`;
    }
    return 'Object';
  }
  return 'Number';
};

const getVarValue = (v) => {
  if (!v) return '---';
  if (v.isobj) {
    if (v.objval === null) return 'null';
    if (v.objval.toString && v.objval.toString !== Object.prototype.toString) {
      return v.objval.toString();
    }
    try {
      return JSON.stringify(v.objval);
    } catch (e) {
      return '[Complex Object]';
    }
  }

  if (Number.isNaN(v.numval)) return 'NaN';
  if (!Number.isFinite(v.numval)) return 'Infinity';

  return parseFloat(v.numval.toFixed(6));
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  updateTimer = setInterval(() => {
    tick.value++;
  }, 50);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);

  if (updateTimer) {
    clearInterval(updateTimer);
  }
});
</script>

<style scoped>
.vars-container {
  width: 100%;
  height: 100%;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  background-color: #1e1e24;
}

.vars-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #8c6bed;
  padding-bottom: 10px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.vars-header h2 {
  margin: 0;
  color: #8c6bed;
}

.btn-close {
  background: transparent;
  color: #f7ce74;
  border: 2px solid #f7ce74;
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.btn-close:hover {
  background: #f7ce74;
  color: black;
}

.vars-content {
  flex-grow: 1;
  overflow-y: auto;
}

.table-wrapper {
  background: #2a2a35;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #3d3d4e;
}

.vars-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.vars-table th {
  background-color: #3d3d4e;
  color: #a8a8c0;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.vars-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #3d3d4e;
  font-family: monospace;
  font-size: 15px;
}

.vars-table tr:last-child td {
  border-bottom: none;
}

.vars-table tr:hover {
  background-color: #353542;
}

.row-system td {
  background-color: rgba(0, 0, 0, 0.15);
}

.col-name {
  color: #f7ce74;
  font-weight: bold;
}

.col-value {
  color: #ffffff;
  word-break: break-all;
}

.badge-const {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #8c6bed;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-family: sans-serif;
  text-transform: uppercase;
}

.type-label {
  color: #8c6bed;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #a8a8c0;
  font-size: 18px;
  font-style: italic;
  background: #2a2a35;
  border-radius: 8px;
  border: 1px dashed #3d3d4e;
}
</style>