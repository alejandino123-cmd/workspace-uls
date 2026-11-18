<script setup lang="ts">
import { RouterView } from 'vue-router'
import Chatbot from '@/components/Chatbot.vue'
</script>

<template>
  <RouterView />
  <!-- Aquí vive el chatbot: no se destruye al cambiar de página -->
  <Chatbot />
</template>