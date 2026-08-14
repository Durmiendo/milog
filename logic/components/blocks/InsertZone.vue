<template>
  <div class="insert-zone" @click.stop="$emit('add')">
    <div class="insert-line"></div>
    <button class="insert-btn">+</button>
  </div>
</template>
<script setup> defineEmits(['add']) </script>
<style scoped>
.insert-zone { position: absolute; left: 0; width: 100%; height: 20px; display: flex; align-items: center; justify-content: center; opacity: 0.35; z-index: 45; cursor: pointer; transition: opacity 0.2s; bottom: -14px; }
.insert-zone:hover { opacity: 1; }
.insert-line { position: absolute; width: 100%; height: 2px; background-color: #8c6bed; z-index: 1; opacity: 0.5; }
.insert-btn { position: relative; z-index: 2; background: #8c6bed; color: white; border: 2px solid #1a1a1a; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; transition: transform 0.2s; }
.insert-btn:hover { transform: scale(1.2); background-color: #a38bf5; }
</style>