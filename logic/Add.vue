<script setup>
import { ref, computed, onMounted } from 'vue';
import { cats, all } from './sttms.js';

const emit = defineEmits(['select', 'close']);

const searchQuery = ref('');
const searchInputRef = ref(null);

const categoryOrder = [
  'io', 'block', 'operation', 'control', 'unit', 'world', 'unknown'
];

const groupedCommands = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const groups = {};

  all.objs.forEach(cmd => {
    if (cmd.name.toLowerCase().includes(query)) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    }
  });

  return categoryOrder.map(catKey => ({
    key: catKey,
    meta: cats[catKey] || { name: 'Unknown', color: '#777777' },
    commands: groups[catKey] || []
  })).filter(group => group.commands.length > 0);
});

const selectCommand = (cmdName) => {
  emit('select', cmdName);
};

onMounted(() => {
  searchInputRef.value?.focus();
});
</script>

<template>
  <div class="add-modal">
    <div class="modal-header">
      <h2>Add Instruction</h2>
      <button class="close-btn" @click="emit('close')">&times;</button>
    </div>

    <div class="search-container">
      <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="search-input"
      />
    </div>

    <div class="categories-scroll">
      <div v-if="groupedCommands.length === 0" class="no-results">
        No instructions found.
      </div>

      <div
          v-for="group in groupedCommands"
          :key="group.key"
          class="category-section"
      >
        <div class="category-title" :style="{ color: group.meta.color }">
          {{ group.meta.name }}
        </div>
        <div class="commands-grid">
          <button
              v-for="cmd in group.commands"
              :key="cmd.name"
              class="cmd-btn"
              :style="{ '--c': group.meta.color }"
              @click="selectCommand(cmd.name)"
          >
            {{ cmd.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.add-modal {
  margin: auto;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  border: 2px solid #333;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  font-family: inherit;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #222;
  border-bottom: 2px solid #333;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #fff;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #ff5e5e;
}

.search-container {
  padding: 16px 20px 0;
}

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 2px solid #8c6bed;
  color: #fff;
  font-size: 18px;
  padding: 8px 0;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.search-input:focus {
  border-bottom-color: #a38bf5;
}

.categories-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px 20px;
}

/* Кастомный скроллбар */
.categories-scroll::-webkit-scrollbar {
  width: 8px;
}
.categories-scroll::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.categories-scroll::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}
.categories-scroll::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.no-results {
  color: #888;
  text-align: center;
  padding: 40px 0;
  font-size: 16px;
}

.category-section {
  margin-top: 20px;
}

.category-title {
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.cmd-btn {
  background: transparent;
  border: 2px solid var(--c);
  color: var(--c);
  padding: 10px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease-out;
  text-align: center;
}

.cmd-btn:hover {
  background-color: var(--c);
  color: #111;
  box-shadow: 0 0 12px var(--c);
  transform: translateY(-2px);
}

.cmd-btn:active {
  transform: translateY(0);
}
</style>