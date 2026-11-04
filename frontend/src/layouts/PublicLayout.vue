<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
</script>

<template>
  <div class="public-layout">
    <AppNavbar />
    <main class="public-content">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--p-content-background);
  color: var(--p-text-color);
}

.public-content {
  flex: 1;
}
</style>
