<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppPrivateNavbar from '@/components/layout/AppPrivateNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Si la página se recarga, el usuario sale del navegador (localStorage) al store
onMounted(() => {
  if (authStore.token && !authStore.user) authStore.fetchUser()
})
</script>

<template>
  <div class="private-layout">
    <AppPrivateNavbar />
    <main class="private-content">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.private-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f1f5f9; /* slate-100, igual que Login, Registro y PublicLayout */
  color: #1e293b; /* slate-800 */
}

.private-content {
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
</style>