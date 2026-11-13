<script setup lang="ts">
import logoUls from '@/assets/logo-uls-escudo.png'

// Escudo de la Universidad Luterana Salvadoreña, usado como logo de la plataforma.
// <LogoWorkspace size="3rem" />
withDefaults(defineProps<{ size?: string }>(), { size: '2.6rem' })
</script>

<template>
  <img :src="logoUls" alt="" aria-hidden="true" class="logo" :style="{ width: size, height: size }" />
</template>

<style scoped>
.logo {
  display: block;
  object-fit: contain;
  border-radius: 6px;
}
</style>
