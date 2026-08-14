<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import LogicProcessor from "../../logic/LogicProcessor.vue";

const { Layout } = DefaultTheme
const { frontmatter } = useData()
</script>

<template>
  <!-- Если это обычная текстовая страница, рендерим стандартную тему DefaultTheme -->
  <Layout v-if="frontmatter.layout !== 'logic'">
    <template #doc-before>
      <h1 v-if="frontmatter.title" id="automatic-title">
        {{ frontmatter.title }}
      </h1>
    </template>
  </Layout>

  <!-- Если это интерактивная задача, рендерим кастомный полноэкранный холст -->
  <div v-else class="custom-logic-page">
    <LogicProcessor>
      <Content />
    </LogicProcessor>
  </div>
</template>

<style scoped>
.custom-logic-page {
  background-color: #1a1a1a;
  min-height: 100vh;
  color: white;
}
#automatic-title {
  margin-bottom: 32px;
  letter-spacing: -0.02em;
  line-height: 40px;
  font-size: 32px;
  font-weight: 600;
  outline: none;
}
</style>