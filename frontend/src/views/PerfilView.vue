<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function salir() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div style="padding: 2rem">
    <h1>Hola, {{ authStore.user?.name }}</h1>
    <p>Rol: {{ authStore.rol }}</p>
    <Button label="Cerrar sesión" icon="pi pi-sign-out" severity="secondary" @click="salir" />
  </div>
</template>