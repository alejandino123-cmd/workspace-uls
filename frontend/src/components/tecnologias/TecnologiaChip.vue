<script setup lang="ts">
import { computed } from 'vue'
import Chip from 'primevue/chip'
import { iconoDataUrl } from '@/lib/iconosTecnologia'

// Etiqueta de tecnología con su logo cuando existe. Usa el Chip de PrimeVue.
const props = defineProps<{ nombre: string; tamano?: 'normal' | 'pequeno' }>()

const icono = computed(() => iconoDataUrl(props.nombre))
</script>

<template>
  <Chip :label="nombre" :image="icono ?? undefined" :icon="icono ? undefined : 'pi pi-code'" :class="['tec', { pequeno: tamano === 'pequeno' }]" />
</template>

<style scoped>
.tec {
  max-width: 100%;
  min-width: 0;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  color: var(--ws-texto);
  font-weight: 600;
  font-size: 0.85rem;
}

.tec :deep(img) {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
}

.tec :deep(.p-chip-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tec.pequeno {
  font-size: 0.78rem;
}
</style>
