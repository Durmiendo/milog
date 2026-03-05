<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'

const { Layout } = DefaultTheme
const { frontmatter } = useData()
</script>

<template>
  <Layout>
    <template #doc-before>
      <h1 v-if="frontmatter.title" id="automatic-title">
        {{ frontmatter.title }}
      </h1>
    </template>
  </Layout>
</template>

<style scoped>
#automatic-title {
  margin-bottom: 32px;
  letter-spacing: -0.02em;
  line-height: 40px;
  font-size: 32px;
  font-weight: 600;
  outline: none;
}
</style>