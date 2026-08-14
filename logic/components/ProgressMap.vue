<template>
  <div class="progress-map">
    <section v-for="chapter in visibleChapters" :key="chapter.id" class="progress-chapter">
      <header class="progress-head">
        <a class="progress-title" :href="withBase(chapter.link)">{{ chapter.title }}</a>
        <span class="progress-count">{{ ready ? doneCount(chapter) : 0 }} / {{ chapter.lessons.length }}</span>
      </header>

      <p class="progress-goal">{{ chapter.goal }}</p>

      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: (ready ? percent(chapter) : 0) + '%' }"></div>
      </div>

      <ol class="progress-list">
        <li v-for="lesson in chapter.lessons" :key="lesson.id" :class="{ 'is-solved': ready && isSolved(lesson.id) }">
          <span class="progress-mark">{{ ready && isSolved(lesson.id) ? '[x]' : '[ ]' }}</span>
          <a :href="withBase(lesson.link)">{{ lesson.title }}</a>
        </li>
      </ol>

      <button class="progress-reset" @click="reset(chapter)">сбросить прогресс главы</button>
    </section>
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import {withBase} from 'vitepress'
import {chapters} from '../core/lessons.js'
import {useProgress} from '../composables/useProgress.js'

const props = defineProps({
  chapter: {type: String, default: ''}
})

const {isSolved, forgetAll} = useProgress()
const ready = ref(false)

onMounted(() => {
  ready.value = true
})

const visibleChapters = computed(() =>
    props.chapter ? chapters.filter(c => c.id === props.chapter) : chapters
)

const doneCount = (chapter) => chapter.lessons.filter(l => isSolved(l.id)).length
const percent = (chapter) => Math.round((doneCount(chapter) / chapter.lessons.length) * 100)
const reset = (chapter) => forgetAll(chapter.lessons.map(l => l.id))
</script>

<style scoped>
.progress-chapter {
  border: 2px solid var(--vp-c-divider);
  padding: 16px 18px;
  margin: 20px 0;
}

.progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.progress-title {
  font-weight: 700;
  font-size: 17px;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.progress-title:hover {
  color: #f7ce74;
}

.progress-count {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.progress-goal {
  margin: 8px 0 12px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.progress-bar {
  height: 6px;
  background: var(--vp-c-divider);
  margin-bottom: 14px;
}

.progress-bar-fill {
  height: 100%;
  background: #b8d8be;
  transition: width 0.2s;
}

.progress-list {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
}

.progress-list li {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 3px 0;
}

.progress-mark {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}

.progress-list li.is-solved .progress-mark {
  color: #b8d8be;
}

.progress-list a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.progress-list a:hover {
  color: #f7ce74;
}

.progress-reset {
  font-size: 13px;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
  padding: 3px 10px;
  cursor: pointer;
  background: transparent;
}

.progress-reset:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}
</style>
